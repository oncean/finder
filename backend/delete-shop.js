const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'fengxiangbiao'
});

async function main() {
  await client.connect();

  // Find 测试店铺A
  const shop = await client.query(
    "SELECT id, name FROM shops WHERE name = '测试店铺A'"
  );

  if (shop.rows.length === 0) {
    console.log('未找到 测试店铺A');
    await client.end();
    return;
  }

  const shopId = shop.rows[0].id;
  console.log('Found:', shop.rows[0].name, 'id:', shopId);

  const delComments = await client.query(
    'DELETE FROM comments WHERE shop_id = $1', [shopId]
  );
  console.log('Deleted comments:', delComments.rowCount);

  // Delete related posts
  const delPosts = await client.query(
    'DELETE FROM posts WHERE shop_id = $1', [shopId]
  );
  console.log('Deleted posts:', delPosts.rowCount);

  // Delete the shop
  const delShop = await client.query(
    'DELETE FROM shops WHERE id = $1', [shopId]
  );
  console.log('Deleted shop:', delShop.rowCount);

  await client.end();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  client.end();
});
