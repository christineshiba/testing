// Migration script to move legacy communities to the communities table
// and add Christine as moderator for each

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Christine's email
const CHRISTINE_EMAIL = 'christinetshiba@gmail.com';

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function migrate() {
  console.log('Starting legacy community migration...\n');

  // 1. Get Christine's user ID
  console.log('Looking up Christine...');
  const { data: christine, error: christineError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', CHRISTINE_EMAIL)
    .single();

  if (christineError || !christine) {
    console.error('Could not find Christine:', christineError);
    process.exit(1);
  }
  console.log(`Found Christine: ${christine.name} (${christine.id})\n`);

  // 2. Get all unique community names from user profiles
  console.log('Fetching legacy communities from user profiles...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('communities')
    .not('communities', 'is', null);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    process.exit(1);
  }

  // Collect all unique community names
  const legacyCommunities = new Set();
  users.forEach(user => {
    if (user.communities && Array.isArray(user.communities)) {
      user.communities.forEach(name => legacyCommunities.add(name));
    }
  });

  console.log(`Found ${legacyCommunities.size} unique legacy communities:\n`);
  legacyCommunities.forEach(name => console.log(`  - ${name}`));
  console.log('');

  // 3. Get existing communities in the communities table
  console.log('Checking existing communities in database...');
  const { data: existingCommunities, error: existingError } = await supabase
    .from('communities')
    .select('name, slug, id');

  if (existingError) {
    console.error('Error fetching existing communities:', existingError);
    process.exit(1);
  }

  const existingNames = new Set(existingCommunities?.map(c => c.name) || []);
  const existingSlugs = new Set(existingCommunities?.map(c => c.slug) || []);
  console.log(`Found ${existingNames.size} existing communities in table\n`);

  // 4. Create records for legacy communities that don't exist yet
  const toCreate = [...legacyCommunities].filter(name => !existingNames.has(name));
  console.log(`Need to create ${toCreate.length} new community records:\n`);

  for (const name of toCreate) {
    let slug = generateSlug(name);

    // Ensure slug is unique
    let slugAttempt = slug;
    let counter = 1;
    while (existingSlugs.has(slugAttempt)) {
      slugAttempt = `${slug}-${counter}`;
      counter++;
    }
    slug = slugAttempt;
    existingSlugs.add(slug);

    console.log(`Creating: ${name} (slug: ${slug})`);

    const { data: newCommunity, error: createError } = await supabase
      .from('communities')
      .insert({
        name: name,
        slug: slug,
        description: null,
        is_private: false,
        created_by: christine.id,
      })
      .select()
      .single();

    if (createError) {
      console.error(`  Error creating ${name}:`, createError.message);
      continue;
    }

    console.log(`  Created with ID: ${newCommunity.id}`);

    // Add Christine as moderator
    const { error: memberError } = await supabase
      .from('community_members')
      .insert({
        community_id: newCommunity.id,
        user_id: christine.id,
        role: 'moderator',
      });

    if (memberError && memberError.code !== '23505') {
      console.error(`  Error adding Christine as moderator:`, memberError.message);
    } else {
      console.log(`  Added Christine as moderator`);
    }
  }

  // 5. For existing communities, ensure Christine is a moderator
  console.log('\nEnsuring Christine is moderator for existing communities...\n');

  for (const community of existingCommunities || []) {
    // Check if community has any moderators
    const { data: mods, error: modsError } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', community.id)
      .in('role', ['admin', 'moderator']);

    if (modsError) {
      console.error(`  Error checking mods for ${community.name}:`, modsError.message);
      continue;
    }

    if (mods && mods.length > 0) {
      console.log(`${community.name}: Already has ${mods.length} moderator(s)`);
      continue;
    }

    // No moderators, add Christine
    console.log(`${community.name}: No moderators, adding Christine...`);

    const { error: addError } = await supabase
      .from('community_members')
      .upsert({
        community_id: community.id,
        user_id: christine.id,
        role: 'moderator',
      }, {
        onConflict: 'community_id,user_id',
      });

    if (addError) {
      // Try insert instead
      const { error: insertError } = await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: christine.id,
          role: 'moderator',
        });

      if (insertError && insertError.code !== '23505') {
        console.error(`  Error:`, insertError.message);
      } else {
        console.log(`  Added Christine as moderator`);
      }
    } else {
      console.log(`  Added Christine as moderator`);
    }
  }

  console.log('\n✅ Migration complete!');
}

migrate().catch(console.error);
