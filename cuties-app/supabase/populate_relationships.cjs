const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const CONNECTION_STRING = 'postgresql://postgres:sTsubomi_123@db.lhawpdkhmuivpiwylozo.supabase.co:5432/postgres';

async function populateRelationships() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  console.log('Connected to database\n');

  // Build username -> id map
  console.log('Building username map...');
  const usersRes = await client.query('SELECT id, username, name FROM users');
  const usernameMap = new Map();

  for (const row of usersRes.rows) {
    if (row.username) usernameMap.set(row.username, row.id);
    if (row.name) usernameMap.set(row.name, row.id);
  }
  console.log(`Mapped ${usernameMap.size} usernames to IDs\n`);

  // Get all users with relationship data
  const users = await client.query(`
    SELECT id, name, username,
           bananas_raw, sweets_raw, lemons_raw, kiwis_raw,
           melons_raw, watermelons_raw, raspberries_raw,
           raspberriedby_raw, hidden_sweets_raw, pantry_raw
    FROM users
    WHERE name IS NOT NULL
  `);
  console.log(`Processing ${users.rows.length} users with profiles...\n`);

  // Clear existing relationship data
  console.log('Clearing existing relationship tables...');
  await client.query('TRUNCATE likes, friendships, met_ups, hidden_users, rejections, vouches CASCADE');

  // Track stats
  const stats = {
    likes: 0,
    friendships: 0,
    met_ups: 0,
    hidden_users: 0,
    rejections: 0,
    vouches: 0,
    unresolved: 0
  };

  // Helper to resolve username to ID
  function resolveUser(username) {
    if (!username) return null;
    const trimmed = username.trim();
    return usernameMap.get(trimmed) || null;
  }

  // Process each user
  for (const user of users.rows) {
    const userId = user.id;

    // LIKES (Bananas = people this user is interested in)
    if (user.bananas_raw && user.bananas_raw.length > 0) {
      for (const target of user.bananas_raw) {
        const targetId = resolveUser(target);
        if (targetId && targetId !== userId) {
          try {
            await client.query(
              'INSERT INTO likes (id, sender_id, receiver_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [uuidv4(), userId, targetId]
            );
            stats.likes++;
          } catch (e) {}
        } else if (!targetId) {
          stats.unresolved++;
        }
      }
    }

    // FRIENDSHIPS (Kiwis = friends)
    if (user.kiwis_raw && user.kiwis_raw.length > 0) {
      for (const target of user.kiwis_raw) {
        const targetId = resolveUser(target);
        if (targetId && targetId !== userId) {
          // Ensure consistent ordering for friendships
          const [user1, user2] = userId < targetId ? [userId, targetId] : [targetId, userId];
          try {
            await client.query(
              'INSERT INTO friendships (id, user1_id, user2_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [uuidv4(), user1, user2]
            );
            stats.friendships++;
          } catch (e) {}
        }
      }
    }

    // MET_UPS (Melons = people they've met)
    if (user.melons_raw && user.melons_raw.length > 0) {
      for (const target of user.melons_raw) {
        const targetId = resolveUser(target);
        if (targetId && targetId !== userId) {
          // Ensure consistent ordering
          const [user1, user2] = userId < targetId ? [userId, targetId] : [targetId, userId];
          try {
            await client.query(
              'INSERT INTO met_ups (id, user1_id, user2_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [uuidv4(), user1, user2]
            );
            stats.met_ups++;
          } catch (e) {}
        }
      }
    }

    // HIDDEN_USERS (Pantry = people this user has hidden)
    if (user.pantry_raw && user.pantry_raw.length > 0) {
      for (const target of user.pantry_raw) {
        const targetId = resolveUser(target);
        if (targetId && targetId !== userId) {
          try {
            await client.query(
              'INSERT INTO hidden_users (id, user_id, hidden_user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [uuidv4(), userId, targetId]
            );
            stats.hidden_users++;
          } catch (e) {}
        }
      }
    }

    // REJECTIONS (Raspberries = people this user rejected)
    if (user.raspberries_raw && user.raspberries_raw.length > 0) {
      for (const target of user.raspberries_raw) {
        const targetId = resolveUser(target);
        if (targetId && targetId !== userId) {
          try {
            await client.query(
              'INSERT INTO rejections (id, rejector_id, rejected_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [uuidv4(), userId, targetId]
            );
            stats.rejections++;
          } catch (e) {}
        }
      }
    }

    // VOUCHES (Watermelons = people this user vouched for)
    if (user.watermelons_raw && user.watermelons_raw.length > 0) {
      for (const target of user.watermelons_raw) {
        const targetId = resolveUser(target);
        if (targetId && targetId !== userId) {
          try {
            await client.query(
              'INSERT INTO vouches (id, voucher_id, vouchee_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [uuidv4(), userId, targetId]
            );
            stats.vouches++;
          } catch (e) {}
        }
      }
    }
  }

  // Print stats
  console.log('=== Relationship Tables Populated ===\n');
  console.log(`Likes (Bananas): ${stats.likes}`);
  console.log(`Friendships (Kiwis): ${stats.friendships}`);
  console.log(`Met Ups (Melons): ${stats.met_ups}`);
  console.log(`Hidden Users (Pantry): ${stats.hidden_users}`);
  console.log(`Rejections (Raspberries): ${stats.rejections}`);
  console.log(`Vouches (Watermelons): ${stats.vouches}`);
  console.log(`\nUnresolved usernames: ${stats.unresolved}`);

  // Verify counts in DB
  console.log('\n=== Verified Row Counts ===\n');
  const tables = ['likes', 'friendships', 'met_ups', 'hidden_users', 'rejections', 'vouches'];
  for (const table of tables) {
    const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
    console.log(`${table}: ${res.rows[0].count}`);
  }

  // Check mutual matches (Lemons) - these should be mutual likes
  console.log('\n=== Mutual Matches (Lemons) ===');
  const mutualRes = await client.query(`
    SELECT COUNT(*) FROM mutual_likes
  `);
  console.log(`Mutual likes found: ${mutualRes.rows[0].count}`);

  await client.end();
}

populateRelationships().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
