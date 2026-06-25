const { Client } = require('pg');

async function getUsers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'fengxiangbiao',
    user: 'postgres',
    password: 'admin',
  });

  await client.connect();

  // 查询所有用户，按创建时间排序，获取前15个
  const result = await client.query(
    'SELECT id, nickname, phone, "isAdmin", "createdAt" FROM users ORDER BY "createdAt" ASC LIMIT 15'
  );

  console.log(JSON.stringify(result.rows, null, 2));

  await client.end();
}

getUsers().catch(console.error);
