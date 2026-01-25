#!/usr/bin/env python3
"""
Cuties App Data Migration Script
Migrates data from Bubble.io CSV exports to Supabase PostgreSQL

Usage:
    1. Set SUPABASE_URL and SUPABASE_KEY environment variables
    2. Run: python migrate_data.py

Or use with direct database connection:
    Set DATABASE_URL environment variable
    Run: python migrate_data.py --direct
"""

import csv
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
import argparse

# Try to import supabase client
try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

# Try to import psycopg2 for direct connection
try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


EXPORT_DIR = Path(__file__).parent.parent / "bubble-exports"

# CSV file mapping
CSV_FILES = {
    "users": "export_All-Users_2026-01-21_02-10-40.csv",
    "messages": "export_All-Messages_2026-01-21_02-10-58.csv",
    "likes": "export_All-Likes_2026-01-21_02-12-18.csv",
    "friend_testimonials": "export_All-FriendTestimonials_2026-01-21_02-12-03.csv",
    "app_testimonials": "export_All-AppTestimonials_2026-01-21_02-15-32.csv",
    "met_ups": "export_All-Met-Ups_2026-01-21_02-11-44.csv",
    "projects": "export_All-Projects_2026-01-21_02-12-51.csv",
    "user_links": "export_All-UserLinks_2026-01-21_02-13-02.csv",
    "videos": "export_All-Videos_2026-01-21_02-13-13.csv",
    "pairings": "export_All-Pairings_2026-01-21_02-12-42.csv",
}


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse Bubble date format to datetime."""
    if not date_str:
        return None
    try:
        # Format: "Jul 19, 2023 3:11 am"
        return datetime.strptime(date_str, "%b %d, %Y %I:%M %p")
    except ValueError:
        try:
            # Try alternate format
            return datetime.strptime(date_str, "%b %d, %Y %I:%M %p")
        except ValueError:
            return None


def parse_array(value: str) -> list:
    """Parse comma-separated string to array."""
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_bool(value: str) -> bool:
    """Parse yes/no to boolean."""
    return value.lower() == "yes" if value else False


def read_csv(filename: str) -> list[dict]:
    """Read CSV file and return list of dictionaries."""
    filepath = EXPORT_DIR / filename
    if not filepath.exists():
        print(f"Warning: {filepath} not found")
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


class DataMigrator:
    def __init__(self, use_supabase: bool = True):
        self.use_supabase = use_supabase
        self.supabase: Optional[Client] = None
        self.conn = None
        self.user_map: dict[str, str] = {}  # username -> uuid
        self.email_map: dict[str, str] = {}  # email -> uuid

    def connect(self):
        """Establish database connection."""
        if self.use_supabase and HAS_SUPABASE:
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_KEY")
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
            self.supabase = create_client(url, key)
            print("Connected to Supabase")
        elif HAS_PSYCOPG2:
            db_url = os.environ.get("DATABASE_URL")
            if not db_url:
                raise ValueError("DATABASE_URL must be set for direct connection")
            self.conn = psycopg2.connect(db_url)
            print("Connected to PostgreSQL directly")
        else:
            raise RuntimeError("No database client available. Install supabase or psycopg2")

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()

    def migrate_users(self) -> dict[str, str]:
        """Migrate users table and build username->uuid mapping."""
        print("\n=== Migrating Users ===")
        rows = read_csv(CSV_FILES["users"])
        print(f"Found {len(rows)} user records")

        users_data = []
        for row in rows:
            email = row.get("email", "").strip()
            if not email:
                continue

            user_id = str(uuid.uuid4())
            self.email_map[email] = user_id

            users_data.append({
                "id": user_id,
                "bubble_id": row.get("Additional Links", "").strip() or None,
                "email": email,
                "age": int(row["Age"]) if row.get("Age", "").strip().isdigit() else None,
                "short_description": row.get("shortdescription", "").strip() or None,
                "background_color": row.get("Background Color", "").strip() or None,
                "consent": parse_bool(row.get("consent", "")),
                "collaborators": parse_array(row.get("Collabs", "")),
                "communities": parse_array(row.get("Communities", "")),
            })

        if self.supabase:
            # Batch insert
            batch_size = 100
            for i in range(0, len(users_data), batch_size):
                batch = users_data[i:i + batch_size]
                self.supabase.table("users").insert(batch).execute()
                print(f"  Inserted users {i + 1} to {min(i + batch_size, len(users_data))}")
        elif self.conn:
            with self.conn.cursor() as cur:
                for user in users_data:
                    cur.execute("""
                        INSERT INTO users (id, bubble_id, email, age, short_description,
                                          background_color, consent, collaborators, communities)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (email) DO NOTHING
                    """, (
                        user["id"], user["bubble_id"], user["email"], user["age"],
                        user["short_description"], user["background_color"], user["consent"],
                        user["collaborators"], user["communities"]
                    ))
            self.conn.commit()

        print(f"  Migrated {len(users_data)} users")
        return self.email_map

    def build_username_map(self):
        """Build username to UUID mapping from various tables."""
        print("\n=== Building Username Map ===")

        # Collect usernames from various tables
        usernames = set()

        # From messages (Creator, Recipient)
        for row in read_csv(CSV_FILES["messages"]):
            if row.get("Creator"):
                usernames.add(row["Creator"].strip())
            if row.get("Recipient"):
                usernames.add(row["Recipient"].strip())

        # From likes (Sender, Receiver)
        for row in read_csv(CSV_FILES["likes"]):
            if row.get("Sender"):
                usernames.add(row["Sender"].strip())
            if row.get("Receiver"):
                usernames.add(row["Receiver"].strip())

        # From friend testimonials
        for row in read_csv(CSV_FILES["friend_testimonials"]):
            if row.get("Creator"):
                usernames.add(row["Creator"].strip())
            if row.get("Subject"):
                usernames.add(row["Subject"].strip())

        # From met_ups
        for row in read_csv(CSV_FILES["met_ups"]):
            if row.get("Creator"):
                usernames.add(row["Creator"].strip())
            if row.get("User 2"):
                usernames.add(row["User 2"].strip())

        # From user_links
        for row in read_csv(CSV_FILES["user_links"]):
            if row.get("User"):
                usernames.add(row["User"].strip())

        # From videos
        for row in read_csv(CSV_FILES["videos"]):
            if row.get("Creator"):
                usernames.add(row["Creator"].strip())

        # Remove empty strings and admin entries
        usernames = {u for u in usernames if u and u != "(App admin)"}

        print(f"Found {len(usernames)} unique usernames")

        # Create UUID for each username (or lookup if user exists)
        for username in usernames:
            if username not in self.user_map:
                self.user_map[username] = str(uuid.uuid4())

        # Update users table with usernames where possible
        if self.supabase:
            for username, user_id in self.user_map.items():
                # Check if user already exists (we'd need to match by some criteria)
                # For now, create placeholder users for usernames not in email list
                pass
        elif self.conn:
            with self.conn.cursor() as cur:
                for username, user_id in self.user_map.items():
                    # Try to update existing user or insert new
                    cur.execute("""
                        INSERT INTO users (id, username)
                        VALUES (%s, %s)
                        ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username
                    """, (user_id, username))
            self.conn.commit()

        return self.user_map

    def get_user_id(self, username: str) -> Optional[str]:
        """Get user UUID from username."""
        if not username or username == "(App admin)":
            return None
        username = username.strip()
        return self.user_map.get(username)

    def migrate_user_links(self):
        """Migrate user links table."""
        print("\n=== Migrating User Links ===")
        rows = read_csv(CSV_FILES["user_links"])
        print(f"Found {len(rows)} user link records")

        links_data = []
        for row in rows:
            user_id = self.get_user_id(row.get("User", ""))
            if not user_id:
                continue

            links_data.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "label": row.get("Label", "").strip() or "Link",
                "url": row.get("Link", "").strip(),
                "created_at": parse_date(row.get("Creation Date", "")),
                "updated_at": parse_date(row.get("Modified Date", "")),
            })

        self._insert_records("user_links", links_data)
        print(f"  Migrated {len(links_data)} user links")

    def migrate_projects(self):
        """Migrate projects table."""
        print("\n=== Migrating Projects ===")
        rows = read_csv(CSV_FILES["projects"])
        print(f"Found {len(rows)} project records")

        # Projects don't have a direct user reference in the export
        # We'll need to link them later or skip user_id for now
        projects_data = []
        for row in rows:
            order_str = row.get("Order", "1").strip()
            order = int(order_str) if order_str.isdigit() else 1

            projects_data.append({
                "id": str(uuid.uuid4()),
                "user_id": None,  # Will need manual linking
                "name": row.get("Name", "").strip() or "Untitled",
                "description": row.get("Description", "").strip() or None,
                "link": row.get("Link", "").strip() or None,
                "photo_url": row.get("Photo", "").strip() or None,
                "display_order": order,
                "created_at": parse_date(row.get("Creation Date", "")),
                "updated_at": parse_date(row.get("Modified Date", "")),
            })

        self._insert_records("projects", projects_data)
        print(f"  Migrated {len(projects_data)} projects")

    def migrate_videos(self):
        """Migrate videos table."""
        print("\n=== Migrating Videos ===")
        rows = read_csv(CSV_FILES["videos"])
        print(f"Found {len(rows)} video records")

        videos_data = []
        for row in rows:
            user_id = self.get_user_id(row.get("Creator", ""))

            url = row.get("URL", "").strip()
            # Clean up iframe embeds to just URL
            if "youtube.com/embed/" in url:
                match = re.search(r'youtube\.com/embed/([^"?\s]+)', url)
                if match:
                    url = f"https://www.youtube.com/watch?v={match.group(1)}"

            if not url:
                continue

            videos_data.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "url": url,
                "created_at": parse_date(row.get("Creation Date", "")),
                "updated_at": parse_date(row.get("Modified Date", "")),
            })

        self._insert_records("videos", videos_data)
        print(f"  Migrated {len(videos_data)} videos")

    def migrate_likes(self):
        """Migrate likes table."""
        print("\n=== Migrating Likes ===")
        rows = read_csv(CSV_FILES["likes"])
        print(f"Found {len(rows)} like records")

        likes_data = []
        seen = set()
        for row in rows:
            sender_id = self.get_user_id(row.get("Sender", ""))
            receiver_id = self.get_user_id(row.get("Receiver", ""))

            if not sender_id or not receiver_id:
                continue

            # Prevent duplicates
            key = (sender_id, receiver_id)
            if key in seen:
                continue
            seen.add(key)

            likes_data.append({
                "id": str(uuid.uuid4()),
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "created_at": parse_date(row.get("Creation Date", "")),
            })

        self._insert_records("likes", likes_data)
        print(f"  Migrated {len(likes_data)} likes")

    def migrate_met_ups(self):
        """Migrate met_ups table."""
        print("\n=== Migrating Met Ups ===")
        rows = read_csv(CSV_FILES["met_ups"])
        print(f"Found {len(rows)} met up records")

        met_ups_data = []
        seen = set()
        for row in rows:
            user1_id = self.get_user_id(row.get("Creator", ""))
            user2_id = self.get_user_id(row.get("User 2", ""))

            if not user1_id or not user2_id:
                continue

            # Normalize order to prevent duplicates
            if user1_id > user2_id:
                user1_id, user2_id = user2_id, user1_id

            key = (user1_id, user2_id)
            if key in seen:
                continue
            seen.add(key)

            met_ups_data.append({
                "id": str(uuid.uuid4()),
                "user1_id": user1_id,
                "user2_id": user2_id,
                "created_at": parse_date(row.get("Creation Date", "")),
            })

        self._insert_records("met_ups", met_ups_data)
        print(f"  Migrated {len(met_ups_data)} met ups")

    def migrate_messages(self):
        """Migrate messages table."""
        print("\n=== Migrating Messages ===")
        rows = read_csv(CSV_FILES["messages"])
        print(f"Found {len(rows)} message records")

        messages_data = []
        for row in rows:
            sender_id = self.get_user_id(row.get("Creator", ""))
            recipient_id = self.get_user_id(row.get("Recipient", ""))
            content = row.get("Value", "").strip()

            if not content:
                continue

            messages_data.append({
                "id": str(uuid.uuid4()),
                "sender_id": sender_id,
                "recipient_id": recipient_id,
                "content": content,
                "created_at": parse_date(row.get("Creation Date", "")),
                "updated_at": parse_date(row.get("Modified Date", "")),
            })

        self._insert_records("messages", messages_data)
        print(f"  Migrated {len(messages_data)} messages")

    def migrate_friend_testimonials(self):
        """Migrate friend testimonials table."""
        print("\n=== Migrating Friend Testimonials ===")
        rows = read_csv(CSV_FILES["friend_testimonials"])
        print(f"Found {len(rows)} friend testimonial records")

        testimonials_data = []
        for row in rows:
            author_id = self.get_user_id(row.get("Creator", ""))
            subject_id = self.get_user_id(row.get("Subject", ""))
            content = row.get("Value", "").strip()

            if not content:
                continue

            testimonials_data.append({
                "id": str(uuid.uuid4()),
                "author_id": author_id,
                "subject_id": subject_id,
                "content": content,
                "created_at": parse_date(row.get("Creation Date", "")),
                "updated_at": parse_date(row.get("Modified Date", "")),
            })

        self._insert_records("friend_testimonials", testimonials_data)
        print(f"  Migrated {len(testimonials_data)} friend testimonials")

    def migrate_app_testimonials(self):
        """Migrate app testimonials table."""
        print("\n=== Migrating App Testimonials ===")
        rows = read_csv(CSV_FILES["app_testimonials"])
        print(f"Found {len(rows)} app testimonial records")

        testimonials_data = []
        for row in rows:
            author_id = self.get_user_id(row.get("Creator", ""))
            content = row.get("Value", "").strip()

            if not content:
                continue

            testimonials_data.append({
                "id": str(uuid.uuid4()),
                "author_id": author_id,
                "username": row.get("Username", "").strip() or None,
                "content": content,
                "created_at": parse_date(row.get("Creation Date", "")),
                "updated_at": parse_date(row.get("Modified Date", "")),
            })

        self._insert_records("app_testimonials", testimonials_data)
        print(f"  Migrated {len(testimonials_data)} app testimonials")

    def migrate_pairings(self):
        """Migrate pairings table."""
        print("\n=== Migrating Pairings ===")
        rows = read_csv(CSV_FILES["pairings"])
        print(f"Found {len(rows)} pairing records")

        pairings_data = []
        for row in rows:
            match1_name = row.get("Match 1 ", "").strip()
            match2_name = row.get("Match 2", "").strip()

            match1_id = self.get_user_id(match1_name) if match1_name else None
            match2_id = self.get_user_id(match2_name) if match2_name else None

            here_for = parse_array(row.get("Here for", ""))

            pairings_data.append({
                "id": str(uuid.uuid4()),
                "match1_id": match1_id,
                "match2_id": match2_id,
                "match1_name": match1_name or None,
                "match2_name": match2_name or None,
                "match2_alt_name": row.get("Match 2 Alt name", "").strip() or None,
                "contact_info": row.get("Contact Info2", "").strip() or None,
                "description": row.get("Description", "").strip() or None,
                "here_for": here_for,
                "anonymous": row.get("Anonymous", "").lower() == "yes",
            })

        self._insert_records("pairings", pairings_data)
        print(f"  Migrated {len(pairings_data)} pairings")

    def _insert_records(self, table: str, records: list[dict]):
        """Insert records into table."""
        if not records:
            return

        if self.supabase:
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                try:
                    self.supabase.table(table).insert(batch).execute()
                except Exception as e:
                    print(f"  Error inserting into {table}: {e}")
        elif self.conn:
            # Build dynamic insert query
            columns = list(records[0].keys())
            placeholders = ", ".join(["%s"] * len(columns))
            col_names = ", ".join(columns)

            with self.conn.cursor() as cur:
                for record in records:
                    values = [record[col] for col in columns]
                    try:
                        cur.execute(
                            f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                            values
                        )
                    except Exception as e:
                        print(f"  Error inserting record: {e}")
            self.conn.commit()

    def run_migration(self):
        """Run the full migration."""
        print("=" * 50)
        print("Cuties App Data Migration")
        print("=" * 50)

        self.connect()

        try:
            # Step 1: Migrate users
            self.migrate_users()

            # Step 2: Build username map from all tables
            self.build_username_map()

            # Step 3: Migrate related tables
            self.migrate_user_links()
            self.migrate_projects()
            self.migrate_videos()
            self.migrate_likes()
            self.migrate_met_ups()
            self.migrate_messages()
            self.migrate_friend_testimonials()
            self.migrate_app_testimonials()
            self.migrate_pairings()

            print("\n" + "=" * 50)
            print("Migration Complete!")
            print("=" * 50)

        finally:
            self.close()


def generate_sql_inserts():
    """Generate SQL INSERT statements for manual migration."""
    print("Generating SQL INSERT statements...")

    output_file = EXPORT_DIR.parent / "supabase" / "seed_data.sql"

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("-- Cuties App Seed Data\n")
        f.write("-- Generated from Bubble.io exports\n\n")

        # Users
        f.write("-- Users\n")
        rows = read_csv(CSV_FILES["users"])
        for row in rows:
            email = row.get("email", "").strip()
            if not email:
                continue

            email_escaped = email.replace("'", "''")
            desc = (row.get("shortdescription", "") or "").replace("'", "''")
            age = row.get("Age", "").strip()
            age_val = age if age.isdigit() else "NULL"
            consent = "TRUE" if parse_bool(row.get("consent", "")) else "FALSE"
            bubble_id = row.get("Additional Links", "").strip()
            bubble_id_val = f"'{bubble_id}'" if bubble_id else "NULL"

            collabs = parse_array(row.get("Collabs", ""))
            communities = parse_array(row.get("Communities", ""))
            collabs_arr = "ARRAY[" + ",".join(f"'{c.replace(chr(39), chr(39)+chr(39))}'" for c in collabs) + "]::TEXT[]" if collabs else "'{}'::TEXT[]"
            communities_arr = "ARRAY[" + ",".join(f"'{c.replace(chr(39), chr(39)+chr(39))}'" for c in communities) + "]::TEXT[]" if communities else "'{}'::TEXT[]"

            f.write(f"INSERT INTO users (email, bubble_id, age, short_description, consent, collaborators, communities) ")
            f.write(f"VALUES ('{email_escaped}', {bubble_id_val}, {age_val}, '{desc}', {consent}, {collabs_arr}, {communities_arr}) ")
            f.write("ON CONFLICT (email) DO NOTHING;\n")

        f.write("\n-- Note: Additional tables require username resolution\n")
        f.write("-- Run the Python migration script for full data migration\n")

    print(f"SQL seed file written to: {output_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate Cuties app data to Supabase")
    parser.add_argument("--direct", action="store_true", help="Use direct PostgreSQL connection")
    parser.add_argument("--sql-only", action="store_true", help="Generate SQL INSERT statements only")
    args = parser.parse_args()

    if args.sql_only:
        generate_sql_inserts()
    else:
        migrator = DataMigrator(use_supabase=not args.direct)
        migrator.run_migration()
