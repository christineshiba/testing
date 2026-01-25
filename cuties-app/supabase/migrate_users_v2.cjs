const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');

const EXPORT_DIR = path.join(__dirname, '..', 'bubble-exports');
const CONNECTION_STRING = 'postgresql://postgres:sTsubomi_123@db.lhawpdkhmuivpiwylozo.supabase.co:5432/postgres';
const NEW_USERS_FILE = 'export_All-Users-modified---_2026-01-21_03-22-58.csv';

function readCSV(filename) {
  const filepath = path.join(EXPORT_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseArray(value) {
  if (!value) return [];
  return value.split(' , ').map(s => s.trim()).filter(s => s);
}

function parseBool(value) {
  if (!value) return false;
  return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
}

function parseInt2(value) {
  if (!value) return null;
  const num = parseInt(value);
  return isNaN(num) ? null : num;
}

async function migrateUsers(client) {
  console.log('\n=== Migrating Users from New File ===');
  const rows = readCSV(NEW_USERS_FILE);
  console.log(`Found ${rows.length} user records`);

  // Build username -> id map for existing users
  const existingUsers = await client.query('SELECT id, username, email FROM users');
  const usernameMap = new Map();
  const emailMap = new Map();

  for (const row of existingUsers.rows) {
    if (row.username) usernameMap.set(row.username, row.id);
    if (row.email) emailMap.set(row.email, row.id);
  }
  console.log(`Found ${usernameMap.size} existing username mappings, ${emailMap.size} email mappings`);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  for (const row of rows) {
    const email = row.email?.trim() || null;
    const name = row.Name?.trim() || null;

    // Try to find existing user by email or name
    let userId = email ? emailMap.get(email) : null;
    if (!userId && name) {
      userId = usernameMap.get(name);
    }

    const isUpdate = !!userId;
    if (!userId) {
      userId = uuidv4();
    }

    // Parse photos array (comma separated URLs)
    let photos = [];
    if (row.Photos) {
      photos = row.Photos.split(' , ').map(s => s.trim()).filter(s => s);
    }

    try {
      if (isUpdate) {
        await client.query(`
          UPDATE users SET
            name = $2,
            age = $3,
            gender = $4,
            new_gender = $5,
            pronouns = $6,
            sexuality = $7,
            location = $8,
            new_location = $9,
            nomadic = $10,
            height_feet = $11,
            height_inches = $12,
            kids = $13,
            drugs = $14,
            mono_poly = $15,
            short_description = $16,
            long_description = $17,
            main_photo = $18,
            photos = $19,
            question = $20,
            topics = $21,
            contact_info = $22,
            contact_label = $23,
            social_ig_handle = $24,
            social_ig_link = $25,
            social_x_handle = $26,
            social_x_link = $27,
            social_substack_handle = $28,
            social_substack_link = $29,
            spotify_url = $30,
            spotify_embed = $31,
            link1_label = $32,
            link2_label = $33,
            link3_label = $34,
            tweet1_url = $35,
            tweet1_html = $36,
            tweet2_url = $37,
            tweet2_html = $38,
            tweet3_url = $39,
            tweet3_html = $40,
            here_for = $41,
            interest_type = $42,
            role = $43,
            premium = $44,
            supporter_tier = $45,
            show_supporter_badge = $46,
            paused = $47,
            suspended = $48,
            onboarded = $49,
            like_limit = $50,
            theme = $51,
            popup_seen = $52,
            popup2_seen = $53,
            profile_view_email = $54,
            bananas_raw = $55,
            sweets_raw = $56,
            lemons_raw = $57,
            kiwis_raw = $58,
            melons_raw = $59,
            watermelons_raw = $60,
            raspberries_raw = $61,
            raspberriedby_raw = $62,
            hidden_sweets_raw = $63,
            pantry_raw = $64,
            consent = $65,
            collaborators = $66,
            communities = $67,
            bubble_id = $68,
            unique_id = $69,
            created_at = COALESCE($70, created_at),
            updated_at = COALESCE($71, updated_at)
          WHERE id = $1
        `, [
          userId,
          name,
          parseInt2(row.Age),
          row.Gender?.trim() || null,
          row['NEW Gender']?.trim() || null,
          row.Pronouns?.trim() || null,
          row.sexuality?.trim() || null,
          row.Location?.trim() || null,
          row.NewLocation?.trim() || null,
          row.Nomadic?.trim() || null,
          parseInt2(row.Feet),
          parseInt2(row.Inches),
          row.kids?.trim() || null,
          row.drugs?.trim() || null,
          row['mono/poly']?.trim() || null,
          row.shortdescription?.trim() || null,
          row.longdescription?.trim() || null,
          row.MainPhoto?.trim() || null,
          photos,
          row.question?.trim() || null,
          row.Topics?.trim() || null,
          row['contact info']?.trim() || null,
          row['contact label']?.trim() || null,
          row['Social IG handle']?.trim() || null,
          row['Social Instagram Link']?.trim() || null,
          row['Social X Handle']?.trim() || null,
          row['Social X Link']?.trim() || null,
          row['Social Substack Handle']?.trim() || null,
          row['Social Substack Link']?.trim() || null,
          row.spotifyrawurl?.trim() || null,
          row.spotify?.trim() || null,
          row.link1label?.trim() || null,
          row.link2label?.trim() || null,
          row.link3label?.trim() || null,
          row.tweet1?.trim() || null,
          row.tweet1html?.trim() || null,
          row.tweet2?.trim() || null,
          row.tweet2html?.trim() || null,
          row.tweet3?.trim() || null,
          row.tweet3html?.trim() || null,
          parseArray(row.Herefor),
          row['Interest Type']?.trim() || null,
          row.Role?.trim() || null,
          parseBool(row.Premium),
          row['Cuties Supporter Tier']?.trim() || null,
          parseBool(row['Show Supporter Badge']),
          parseBool(row.Paused),
          parseBool(row.suspended),
          parseBool(row.onboarded),
          parseInt2(row.LikeLimit),
          row.theme?.trim() || null,
          parseBool(row.popupseen),
          parseBool(row.popup2seen),
          parseBool(row.someoneviewedyourprofileemail),
          parseArray(row.Bananas),
          parseArray(row.Sweets),
          parseArray(row.Lemons),
          parseArray(row.Kiwis),
          parseArray(row.Melons),
          parseArray(row.Watermelons),
          parseArray(row.Raspberries),
          parseArray(row.Raspberriedby),
          parseArray(row['Hidden Sweets']),
          parseArray(row.Pantry),
          parseBool(row.consent),
          parseArray(row.Collabs),
          parseArray(row.Communities),
          row['Additional Links']?.trim() || null,
          row['unique id']?.trim() || null,
          parseDate(row['Creation Date']),
          parseDate(row['Modified Date']),
        ]);
        updated++;
      } else {
        await client.query(`
          INSERT INTO users (
            id, email, username, name, age, gender, new_gender, pronouns, sexuality,
            location, new_location, nomadic, height_feet, height_inches, kids, drugs, mono_poly,
            short_description, long_description, main_photo, photos, question, topics,
            contact_info, contact_label, social_ig_handle, social_ig_link, social_x_handle, social_x_link,
            social_substack_handle, social_substack_link, spotify_url, spotify_embed,
            link1_label, link2_label, link3_label,
            tweet1_url, tweet1_html, tweet2_url, tweet2_html, tweet3_url, tweet3_html,
            here_for, interest_type, role, premium, supporter_tier, show_supporter_badge,
            paused, suspended, onboarded, like_limit, theme, popup_seen, popup2_seen, profile_view_email,
            bananas_raw, sweets_raw, lemons_raw, kiwis_raw, melons_raw, watermelons_raw,
            raspberries_raw, raspberriedby_raw, hidden_sweets_raw, pantry_raw,
            consent, collaborators, communities, bubble_id, unique_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
            $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48,
            $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64,
            $65, $66, $67, $68, $69, $70, $71
          )
        `, [
          userId,
          email,
          name, // use name as username
          name,
          parseInt2(row.Age),
          row.Gender?.trim() || null,
          row['NEW Gender']?.trim() || null,
          row.Pronouns?.trim() || null,
          row.sexuality?.trim() || null,
          row.Location?.trim() || null,
          row.NewLocation?.trim() || null,
          row.Nomadic?.trim() || null,
          parseInt2(row.Feet),
          parseInt2(row.Inches),
          row.kids?.trim() || null,
          row.drugs?.trim() || null,
          row['mono/poly']?.trim() || null,
          row.shortdescription?.trim() || null,
          row.longdescription?.trim() || null,
          row.MainPhoto?.trim() || null,
          photos,
          row.question?.trim() || null,
          row.Topics?.trim() || null,
          row['contact info']?.trim() || null,
          row['contact label']?.trim() || null,
          row['Social IG handle']?.trim() || null,
          row['Social Instagram Link']?.trim() || null,
          row['Social X Handle']?.trim() || null,
          row['Social X Link']?.trim() || null,
          row['Social Substack Handle']?.trim() || null,
          row['Social Substack Link']?.trim() || null,
          row.spotifyrawurl?.trim() || null,
          row.spotify?.trim() || null,
          row.link1label?.trim() || null,
          row.link2label?.trim() || null,
          row.link3label?.trim() || null,
          row.tweet1?.trim() || null,
          row.tweet1html?.trim() || null,
          row.tweet2?.trim() || null,
          row.tweet2html?.trim() || null,
          row.tweet3?.trim() || null,
          row.tweet3html?.trim() || null,
          parseArray(row.Herefor),
          row['Interest Type']?.trim() || null,
          row.Role?.trim() || null,
          parseBool(row.Premium),
          row['Cuties Supporter Tier']?.trim() || null,
          parseBool(row['Show Supporter Badge']),
          parseBool(row.Paused),
          parseBool(row.suspended),
          parseBool(row.onboarded),
          parseInt2(row.LikeLimit),
          row.theme?.trim() || null,
          parseBool(row.popupseen),
          parseBool(row.popup2seen),
          parseBool(row.someoneviewedyourprofileemail),
          parseArray(row.Bananas),
          parseArray(row.Sweets),
          parseArray(row.Lemons),
          parseArray(row.Kiwis),
          parseArray(row.Melons),
          parseArray(row.Watermelons),
          parseArray(row.Raspberries),
          parseArray(row.Raspberriedby),
          parseArray(row['Hidden Sweets']),
          parseArray(row.Pantry),
          parseBool(row.consent),
          parseArray(row.Collabs),
          parseArray(row.Communities),
          row['Additional Links']?.trim() || null,
          row['unique id']?.trim() || null,
          parseDate(row['Creation Date']),
          parseDate(row['Modified Date']),
        ]);
        inserted++;
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.log(`  Error for ${name || email}: ${err.message}`);
      }
    }
  }

  console.log(`\n  Updated: ${updated}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);
}

async function main() {
  console.log('='.repeat(50));
  console.log('Cuties App User Migration v2');
  console.log('='.repeat(50));

  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  console.log('Connected to database');

  try {
    await migrateUsers(client);

    // Verify
    const count = await client.query('SELECT COUNT(*) FROM users WHERE name IS NOT NULL');
    console.log(`\nUsers with names: ${count.rows[0].count}`);

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
