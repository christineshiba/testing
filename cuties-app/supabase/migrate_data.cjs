const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');

const EXPORT_DIR = path.join(__dirname, '..', 'bubble-exports');
const CONNECTION_STRING = 'postgresql://postgres:sTsubomi_123@db.lhawpdkhmuivpiwylozo.supabase.co:5432/postgres';

const CSV_FILES = {
  users: 'export_All-Users_2026-01-21_02-10-40.csv',
  messages: 'export_All-Messages_2026-01-21_02-10-58.csv',
  likes: 'export_All-Likes_2026-01-21_02-12-18.csv',
  friend_testimonials: 'export_All-FriendTestimonials_2026-01-21_02-12-03.csv',
  app_testimonials: 'export_All-AppTestimonials_2026-01-21_02-15-32.csv',
  met_ups: 'export_All-Met-Ups_2026-01-21_02-11-44.csv',
  projects: 'export_All-Projects_2026-01-21_02-12-51.csv',
  user_links: 'export_All-UserLinks_2026-01-21_02-13-02.csv',
  videos: 'export_All-Videos_2026-01-21_02-13-13.csv',
  pairings: 'export_All-Pairings_2026-01-21_02-12-42.csv',
};

// Maps
const userMap = new Map(); // username -> uuid
const emailMap = new Map(); // email -> uuid

function readCSV(filename) {
  const filepath = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`Warning: ${filepath} not found`);
    return [];
  }
  const content = fs.readFileSync(filepath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Format: "Jul 19, 2023 3:11 am"
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseArray(value) {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(s => s);
}

function parseBool(value) {
  return value?.toLowerCase() === 'yes';
}

function getUserId(username) {
  if (!username || username === '(App admin)') return null;
  return userMap.get(username.trim()) || null;
}

async function buildUsernameMap() {
  console.log('\n=== Building Username Map ===');
  const usernames = new Set();

  // Collect usernames from all tables
  for (const row of readCSV(CSV_FILES.messages)) {
    if (row.Creator) usernames.add(row.Creator.trim());
    if (row.Recipient) usernames.add(row.Recipient.trim());
  }
  for (const row of readCSV(CSV_FILES.likes)) {
    if (row.Sender) usernames.add(row.Sender.trim());
    if (row.Receiver) usernames.add(row.Receiver.trim());
  }
  for (const row of readCSV(CSV_FILES.friend_testimonials)) {
    if (row.Creator) usernames.add(row.Creator.trim());
    if (row.Subject) usernames.add(row.Subject.trim());
  }
  for (const row of readCSV(CSV_FILES.met_ups)) {
    if (row.Creator) usernames.add(row.Creator.trim());
    if (row['User 2']) usernames.add(row['User 2'].trim());
  }
  for (const row of readCSV(CSV_FILES.user_links)) {
    if (row.User) usernames.add(row.User.trim());
  }
  for (const row of readCSV(CSV_FILES.videos)) {
    if (row.Creator) usernames.add(row.Creator.trim());
  }
  for (const row of readCSV(CSV_FILES.pairings)) {
    if (row['Match 1 ']) usernames.add(row['Match 1 '].trim());
    if (row['Match 2']) usernames.add(row['Match 2'].trim());
  }

  // Remove empty and admin
  usernames.delete('');
  usernames.delete('(App admin)');

  console.log(`Found ${usernames.size} unique usernames`);

  // Create UUID for each username
  for (const username of usernames) {
    userMap.set(username, uuidv4());
  }

  return usernames;
}

async function migrateUsers(client) {
  console.log('\n=== Migrating Users ===');

  // First, insert all username-based users
  console.log(`Inserting ${userMap.size} username-based users...`);
  let usernameCount = 0;
  for (const [username, id] of userMap) {
    try {
      await client.query(`
        INSERT INTO users (id, username)
        VALUES ($1, $2)
      `, [id, username]);
      usernameCount++;
    } catch (err) {
      console.log(`  Error inserting username ${username}: ${err.message}`);
    }
  }
  console.log(`  Inserted ${usernameCount} username-based users`);

  // Then, insert email-based users from CSV
  const rows = readCSV(CSV_FILES.users);
  console.log(`Processing ${rows.length} email-based user records...`);

  let emailCount = 0;
  for (const row of rows) {
    const email = row.email?.trim();
    if (!email) continue;

    const userId = uuidv4();
    emailMap.set(email, userId);

    const age = row.Age?.trim();
    const ageNum = age && /^\d+$/.test(age) ? parseInt(age) : null;

    try {
      await client.query(`
        INSERT INTO users (id, bubble_id, email, age, short_description, background_color, consent, collaborators, communities)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId,
        row['Additional Links']?.trim() || null,
        email,
        ageNum,
        row.shortdescription?.trim() || null,
        row['Background Color']?.trim() || null,
        parseBool(row.consent),
        parseArray(row.Collabs),
        parseArray(row.Communities),
      ]);
      emailCount++;
    } catch (err) {
      console.log(`  Error inserting email user ${email}: ${err.message}`);
    }
  }
  console.log(`  Inserted ${emailCount} email-based users`);
  console.log(`  Total users: ${usernameCount + emailCount}`);
}

async function migrateUserLinks(client) {
  console.log('\n=== Migrating User Links ===');
  const rows = readCSV(CSV_FILES.user_links);
  console.log(`Found ${rows.length} user link records`);

  let count = 0;
  for (const row of rows) {
    const userId = getUserId(row.User);
    if (!userId) continue;

    try {
      await client.query(`
        INSERT INTO user_links (id, user_id, label, url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        userId,
        row.Label?.trim() || 'Link',
        row.Link?.trim(),
        parseDate(row['Creation Date']),
        parseDate(row['Modified Date']),
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} user links`);
}

async function migrateProjects(client) {
  console.log('\n=== Migrating Projects ===');
  const rows = readCSV(CSV_FILES.projects);
  console.log(`Found ${rows.length} project records`);

  let count = 0;
  for (const row of rows) {
    const order = parseInt(row.Order) || 1;

    try {
      await client.query(`
        INSERT INTO projects (id, name, description, link, photo_url, display_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        uuidv4(),
        row.Name?.trim() || 'Untitled',
        row.Description?.trim() || null,
        row.Link?.trim() || null,
        row.Photo?.trim() || null,
        order,
        parseDate(row['Creation Date']),
        parseDate(row['Modified Date']),
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} projects`);
}

async function migrateVideos(client) {
  console.log('\n=== Migrating Videos ===');
  const rows = readCSV(CSV_FILES.videos);
  console.log(`Found ${rows.length} video records`);

  let count = 0;
  for (const row of rows) {
    const userId = getUserId(row.Creator);
    let url = row.URL?.trim();
    if (!url) continue;

    // Clean up iframe embeds
    const match = url.match(/youtube\.com\/embed\/([^"?\s]+)/);
    if (match) {
      url = `https://www.youtube.com/watch?v=${match[1]}`;
    }

    try {
      await client.query(`
        INSERT INTO videos (id, user_id, url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        uuidv4(),
        userId,
        url,
        parseDate(row['Creation Date']),
        parseDate(row['Modified Date']),
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} videos`);
}

async function migrateLikes(client) {
  console.log('\n=== Migrating Likes ===');
  const rows = readCSV(CSV_FILES.likes);
  console.log(`Found ${rows.length} like records`);

  let count = 0;
  const seen = new Set();
  for (const row of rows) {
    const senderId = getUserId(row.Sender);
    const receiverId = getUserId(row.Receiver);
    if (!senderId || !receiverId) continue;

    const key = `${senderId}-${receiverId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      await client.query(`
        INSERT INTO likes (id, sender_id, receiver_id, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [
        uuidv4(),
        senderId,
        receiverId,
        parseDate(row['Creation Date']),
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} likes`);
}

async function migrateMetUps(client) {
  console.log('\n=== Migrating Met Ups ===');
  const rows = readCSV(CSV_FILES.met_ups);
  console.log(`Found ${rows.length} met up records`);

  let count = 0;
  const seen = new Set();
  for (const row of rows) {
    let user1Id = getUserId(row.Creator);
    let user2Id = getUserId(row['User 2']);
    if (!user1Id || !user2Id) continue;

    // Normalize order
    if (user1Id > user2Id) [user1Id, user2Id] = [user2Id, user1Id];

    const key = `${user1Id}-${user2Id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      await client.query(`
        INSERT INTO met_ups (id, user1_id, user2_id, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [
        uuidv4(),
        user1Id,
        user2Id,
        parseDate(row['Creation Date']),
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} met ups`);
}

async function migrateMessages(client) {
  console.log('\n=== Migrating Messages ===');
  const rows = readCSV(CSV_FILES.messages);
  console.log(`Found ${rows.length} message records`);

  let count = 0;
  for (const row of rows) {
    const senderId = getUserId(row.Creator);
    const recipientId = getUserId(row.Recipient);
    const content = row.Value?.trim();
    if (!content) continue;

    try {
      await client.query(`
        INSERT INTO messages (id, sender_id, recipient_id, content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        senderId,
        recipientId,
        content,
        parseDate(row['Creation Date']),
        parseDate(row['Modified Date']),
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} messages`);
}

async function migrateFriendTestimonials(client) {
  console.log('\n=== Migrating Friend Testimonials ===');
  const rows = readCSV(CSV_FILES.friend_testimonials);
  console.log(`Found ${rows.length} friend testimonial records`);

  let count = 0;
  for (const row of rows) {
    const authorId = getUserId(row.Creator);
    const subjectId = getUserId(row.Subject);
    const content = row.Value?.trim();
    if (!content) continue;

    try {
      await client.query(`
        INSERT INTO friend_testimonials (id, author_id, subject_id, content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        authorId,
        subjectId,
        content,
        parseDate(row['Creation Date']),
        parseDate(row['Modified Date']),
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} friend testimonials`);
}

async function migrateAppTestimonials(client) {
  console.log('\n=== Migrating App Testimonials ===');
  const rows = readCSV(CSV_FILES.app_testimonials);
  console.log(`Found ${rows.length} app testimonial records`);

  let count = 0;
  for (const row of rows) {
    const authorId = getUserId(row.Creator);
    const content = row.Value?.trim();
    if (!content) continue;

    try {
      await client.query(`
        INSERT INTO app_testimonials (id, author_id, username, content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        authorId,
        row.Username?.trim() || null,
        content,
        parseDate(row['Creation Date']),
        parseDate(row['Modified Date']),
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} app testimonials`);
}

async function migratePairings(client) {
  console.log('\n=== Migrating Pairings ===');
  const rows = readCSV(CSV_FILES.pairings);
  console.log(`Found ${rows.length} pairing records`);

  let count = 0;
  for (const row of rows) {
    const match1Name = row['Match 1 ']?.trim();
    const match2Name = row['Match 2']?.trim();
    const match1Id = getUserId(match1Name);
    const match2Id = getUserId(match2Name);

    try {
      await client.query(`
        INSERT INTO pairings (id, match1_id, match2_id, match1_name, match2_name, match2_alt_name, contact_info, description, here_for, anonymous)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        uuidv4(),
        match1Id,
        match2Id,
        match1Name || null,
        match2Name || null,
        row['Match 2 Alt name']?.trim() || null,
        row['Contact Info2']?.trim() || null,
        row.Description?.trim() || null,
        parseArray(row['Here for']),
        row.Anonymous?.toLowerCase() === 'yes',
      ]);
      count++;
    } catch (err) {
      // Ignore errors
    }
  }
  console.log(`  Migrated ${count} pairings`);
}

async function main() {
  console.log('='.repeat(50));
  console.log('Cuties App Data Migration');
  console.log('='.repeat(50));

  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  console.log('Connected to database');

  try {
    // Build username map FIRST (before inserting any users)
    await buildUsernameMap();

    // Now migrate users (username-based first, then email-based)
    await migrateUsers(client);

    await migrateUserLinks(client);
    await migrateProjects(client);
    await migrateVideos(client);
    await migrateLikes(client);
    await migrateMetUps(client);
    await migrateMessages(client);
    await migrateFriendTestimonials(client);
    await migrateAppTestimonials(client);
    await migratePairings(client);

    console.log('\n' + '='.repeat(50));
    console.log('Migration Complete!');
    console.log('='.repeat(50));
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
