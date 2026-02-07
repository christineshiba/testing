-- Migration script to properly map friend testimonials to users
-- The issue: testimonials have subject names and author names, but need UUIDs

-- First, let's check what's currently in the friend_testimonials table
-- and what the mapping issue is

-- Step 1: Add columns to store the original names if not exists (for debugging)
ALTER TABLE friend_testimonials
ADD COLUMN IF NOT EXISTS subject_name TEXT,
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS bubble_id TEXT;

-- Step 2: Create a temporary table to hold the CSV data
CREATE TEMP TABLE IF NOT EXISTS temp_testimonials (
    subject_name TEXT,
    content TEXT,
    creation_date TEXT,
    modified_date TEXT,
    slug TEXT,
    author_name TEXT,
    bubble_id TEXT
);

-- The CSV data will need to be imported using the Supabase dashboard or a script
-- For now, this provides the structure for manual import

-- Step 3: After importing CSV data into temp_testimonials, run this to update mappings:
-- This query will update subject_id by matching subject_name to users.name
/*
UPDATE friend_testimonials ft
SET subject_id = u.id
FROM users u
WHERE LOWER(ft.subject_name) = LOWER(u.name)
  AND ft.subject_id IS NULL;

-- This query will update author_id by matching author_name to users.name
UPDATE friend_testimonials ft
SET author_id = u.id
FROM users u
WHERE LOWER(ft.author_name) = LOWER(u.name)
  AND ft.author_id IS NULL;
*/

-- Step 4: Check for unmatched testimonials
-- SELECT subject_name, author_name FROM friend_testimonials WHERE subject_id IS NULL;

-- Step 5: View the mapping issues
-- This helps identify names that don't match exactly
/*
SELECT DISTINCT ft.subject_name, u.name as matched_user
FROM friend_testimonials ft
LEFT JOIN users u ON LOWER(ft.subject_name) = LOWER(u.name)
ORDER BY ft.subject_name;
*/
