const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'fengxiangbiao',
    user: 'postgres',
    password: 'admin',
  });

  await client.connect();
  const result = await client.query(
    `SELECT id, nickname, phone, "isAdmin", created_at FROM users ORDER BY created_at ASC LIMIT 15`
  );
  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
}

main().catch(console.error);
