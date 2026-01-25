import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const supabaseUrl = 'https://lhawpdkhmuivpiwylozo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateMessages() {
  console.log('Reading messages CSV...');
  const csvContent = fs.readFileSync('./bubble-exports/export_All-Messages_2026-01-21_02-10-58.csv', 'utf-8');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} messages to migrate`);

  // First, fetch all users to build a name->id lookup (paginate to get all)
  console.log('Fetching users for ID lookup...');
  let allUsers = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) break;
    allUsers = allUsers.concat(users);
    if (users.length < pageSize) break;
    page++;
  }

  const users = allUsers;

  const userIdByName = {};
  users.forEach(u => {
    if (u.name) {
      userIdByName[u.name.toLowerCase()] = u.id;
    }
  });

  console.log(`Loaded ${Object.keys(userIdByName).length} user name mappings`);

  // First, delete any existing messages to avoid duplicates
  console.log('Clearing existing messages...');
  const { error: deleteError } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    console.error('Error deleting existing messages:', deleteError.message);
  }

  // Parse and prepare messages for insertion
  const messagesToInsert = [];
  let skipped = 0;

  for (const record of records) {
    const recipientName = record['Recipient']?.trim();
    const creatorName = record['Creator']?.trim();
    const content = record['Value']?.trim();
    const createdAt = record['Creation Date'];

    if (!content) {
      skipped++;
      continue;
    }

    const senderId = creatorName ? userIdByName[creatorName.toLowerCase()] : null;
    const recipientId = recipientName ? userIdByName[recipientName.toLowerCase()] : null;

    // Skip if we can't find BOTH users (need both for a valid conversation)
    if (!senderId || !recipientId) {
      skipped++;
      continue;
    }

    // Parse the date
    let parsedDate = null;
    if (createdAt) {
      try {
        parsedDate = new Date(createdAt).toISOString();
      } catch (e) {
        parsedDate = new Date().toISOString();
      }
    }

    messagesToInsert.push({
      sender_id: senderId,
      recipient_id: recipientId,
      content: content,
      created_at: parsedDate,
    });
  }

  console.log(`Prepared ${messagesToInsert.length} messages for insertion (skipped ${skipped})`);

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < messagesToInsert.length; i += batchSize) {
    const batch = messagesToInsert.slice(i, i + batchSize);

    const { error } = await supabase
      .from('messages')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${messagesToInsert.length} messages`);
    }
  }

  console.log('Migration complete!');
}

migrateMessages().catch(console.error);
