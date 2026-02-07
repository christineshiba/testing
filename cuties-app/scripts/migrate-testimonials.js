/**
 * Script to migrate friend testimonials from CSV to Supabase
 *
 * This script:
 * 1. Reads the CSV file with testimonials
 * 2. Fetches all users from Supabase
 * 3. Maps subject names and author names to user IDs
 * 4. Upserts the testimonials with proper foreign key references
 *
 * Run with: node scripts/migrate-testimonials.js
 *
 * Before running, you may need to:
 *   npm install dotenv
 *
 * And create a .env file with:
 *   VITE_SUPABASE_URL=your_url
 *   SUPABASE_SERVICE_ROLE_KEY=your_key
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

// Load .env file manually
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Read .env file and parse it
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
} catch (e) {
  console.log('Note: Could not load .env file:', e.message);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Prefer service role key for full access, fall back to anon key (may have RLS restrictions)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  console.log('');
  console.log('Please set these environment variables. You can:');
  console.log('1. Add them to your .env file:');
  console.log('   VITE_SUPABASE_URL=your_supabase_url');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('');
  console.log('2. Or run with inline environment variables:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/migrate-testimonials.js');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('WARNING: Using anon key instead of service role key.');
  console.log('This may fail due to RLS policies. For best results, use SUPABASE_SERVICE_ROLE_KEY.\n');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Path to the CSV file
const CSV_PATH = '/Users/christineshiba/Downloads/export_All-FriendTestimonials-modified_2026-01-27_05-47-27.csv';

/**
 * Parse CSV content using csv-parse
 */
function parseCSV(content) {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  return records.map(r => ({
    subject_name: r['Subject'] || r['subject'],
    content: r['Value'] || r['value'] || r['content'],
    creation_date: r['Creation Date'] || r['creation_date'],
    modified_date: r['Modified Date'] || r['modified_date'],
    slug: r['Slug'] || r['slug'],
    author_name: r['Creator'] || r['creator'] || r['author'],
    bubble_id: r['unique id'] || r['bubble_id']
  }));
}

/**
 * Normalize a name for matching (lowercase, trim, remove special chars)
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Find best matching user for a name
 * Priority: users with a name field set AND main_photo > users with only username
 * This ensures we match to active, complete profiles rather than placeholder records
 */
function findUserByName(name, users, usersByName) {
  if (!name) return null;

  const lowerName = name.toLowerCase().trim();
  const normalized = normalizeName(name);

  // First priority: users who have BOTH the `name` field AND a main_photo (complete profiles)
  const completeProfiles = users.filter(u => u.name && u.name.trim() && u.main_photo);

  // 1. Exact match on name field for complete profiles
  const exactCompleteMatch = completeProfiles.find(u =>
    u.name.toLowerCase().trim() === lowerName
  );
  if (exactCompleteMatch) return exactCompleteMatch;

  // 2. Normalized match on name for complete profiles
  const normalizedCompleteMatch = completeProfiles.find(u =>
    normalizeName(u.name) === normalized
  );
  if (normalizedCompleteMatch) return normalizedCompleteMatch;

  // Second priority: users with name set (but maybe no photo)
  const usersWithNames = users.filter(u => u.name && u.name.trim());

  const exactNameMatch = usersWithNames.find(u =>
    u.name.toLowerCase().trim() === lowerName
  );
  if (exactNameMatch) return exactNameMatch;

  const normalizedNameMatch = usersWithNames.find(u =>
    normalizeName(u.name) === normalized
  );
  if (normalizedNameMatch) return normalizedNameMatch;

  // Third priority: users with only username (legacy/imported users)
  // Only use these if no name-based match was found
  const usersWithUsernameOnly = users.filter(u => !u.name && u.username);

  const usernameOnlyMatch = usersWithUsernameOnly.find(u =>
    u.username.toLowerCase().trim() === lowerName ||
    normalizeName(u.username) === normalized
  );
  if (usernameOnlyMatch) return usernameOnlyMatch;

  return null;
}

async function migrate() {
  console.log('Starting testimonials migration...\n');

  // Read CSV file
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const testimonials = parseCSV(csvContent);
  console.log(`Found ${testimonials.length} testimonials in CSV\n`);

  // Fetch all users from Supabase (need to paginate to get more than 1000)
  console.log('Fetching users from Supabase...');
  let allUsers = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: batch, error: batchError } = await supabase
      .from('users')
      .select('id, name, username, main_photo')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (batchError) {
      console.error('Error fetching users:', batchError);
      process.exit(1);
    }

    if (!batch || batch.length === 0) break;

    allUsers = allUsers.concat(batch);
    page++;

    if (batch.length < pageSize) break;
  }

  const users = allUsers;
  console.log(`Found ${users.length} users in database\n`);

  // Create lookup map by normalized name
  const usersByName = {};
  users.forEach(user => {
    if (user.name) {
      usersByName[normalizeName(user.name)] = user;
    }
    if (user.username) {
      usersByName[normalizeName(user.username)] = user;
    }
  });

  // Process testimonials
  const matched = [];
  const unmatched = [];

  for (const t of testimonials) {
    // Skip empty testimonials
    if (!t.content || !t.content.trim()) {
      console.log(`Skipping empty testimonial for "${t.subject_name}"`);
      continue;
    }

    const subjectUser = findUserByName(t.subject_name, users, usersByName);
    const authorUser = findUserByName(t.author_name, users, usersByName);

    if (subjectUser) {
      matched.push({
        subject_id: subjectUser.id,
        author_id: authorUser?.id || null,
        content: t.content,
        subject_name: t.subject_name,
        author_name: t.author_name,
        bubble_id: t.bubble_id,
        created_at: t.creation_date ? new Date(t.creation_date).toISOString() : new Date().toISOString()
      });
    } else {
      unmatched.push({
        subject_name: t.subject_name,
        author_name: t.author_name,
        content: t.content?.substring(0, 50) + '...'
      });
    }
  }

  console.log(`\nMatched: ${matched.length} testimonials`);
  console.log(`Unmatched: ${unmatched.length} testimonials\n`);

  if (unmatched.length > 0) {
    console.log('Unmatched testimonials (subject not found in users):');
    unmatched.forEach(u => {
      console.log(`  - Subject: "${u.subject_name}" by "${u.author_name}"`);
    });
    console.log('');
  }

  // Clear existing testimonials and insert new ones
  console.log('Clearing existing testimonials...');
  const { error: deleteError } = await supabase
    .from('friend_testimonials')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

  if (deleteError) {
    console.error('Error clearing testimonials:', deleteError);
    // Continue anyway - might just be empty
  }

  // Insert matched testimonials in batches
  console.log('Inserting testimonials...');
  const batchSize = 50;
  let insertedCount = 0;

  for (let i = 0; i < matched.length; i += batchSize) {
    const batch = matched.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('friend_testimonials')
      .insert(batch.map(t => ({
        subject_id: t.subject_id,
        author_id: t.author_id,
        content: t.content,
        created_at: t.created_at
      })));

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
    } else {
      insertedCount += batch.length;
      console.log(`  Inserted batch ${i / batchSize + 1} (${insertedCount}/${matched.length})`);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`  Total in CSV: ${testimonials.length}`);
  console.log(`  Successfully matched: ${matched.length}`);
  console.log(`  Inserted: ${insertedCount}`);
  console.log(`  Unmatched (no user found): ${unmatched.length}`);
}

migrate().catch(console.error);
