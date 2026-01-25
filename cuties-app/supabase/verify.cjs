const { Client } = require('pg');

async function checkCounts() {
  const client = new Client({
    connectionString: 'postgresql://postgres:sTsubomi_123@db.lhawpdkhmuivpiwylozo.supabase.co:5432/postgres'
  });

  await client.connect();
  console.log('=== Database Row Counts ===\n');

  const tables = [
    'users', 'user_links', 'projects', 'videos', 'likes',
    'met_ups', 'messages', 'friend_testimonials', 'app_testimonials', 'pairings'
  ];

  for (const table of tables) {
    const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
    console.log(`${table}: ${res.rows[0].count} rows`);
  }

  // Sample some data
  console.log('\n=== Sample Users (with username) ===');
  const users = await client.query(`SELECT username, email FROM users WHERE username IS NOT NULL LIMIT 5`);
  users.rows.forEach(r => console.log(`  ${r.username} | ${r.email ? r.email : 'no email'}`));

  console.log('\n=== Sample Messages ===');
  const msgs = await client.query(`
    SELECT u1.username as sender, u2.username as recipient, LEFT(m.content, 50) as content
    FROM messages m
    LEFT JOIN users u1 ON m.sender_id = u1.id
    LEFT JOIN users u2 ON m.recipient_id = u2.id
    WHERE u1.username IS NOT NULL
    LIMIT 3
  `);
  msgs.rows.forEach(r => console.log(`  ${r.sender} -> ${r.recipient}: ${r.content}...`));

  console.log('\n=== Sample Likes ===');
  const likes = await client.query(`
    SELECT u1.username as sender, u2.username as receiver
    FROM likes l
    JOIN users u1 ON l.sender_id = u1.id
    JOIN users u2 ON l.receiver_id = u2.id
    LIMIT 5
  `);
  likes.rows.forEach(r => console.log(`  ${r.sender} ❤️ ${r.receiver}`));

  await client.end();
}

checkCounts().catch(console.error);
