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

  // Get a shop id
  const shopRes = await client.query('SELECT id FROM shops LIMIT 1');
  if (shopRes.rows.length === 0) {
    console.log('No shops found, creating one...');
    const newShop = await client.query(
      `INSERT INTO shops (id, name, address, phone, business_hours, rating, review_count, is_verified, created_at)
       VALUES (gen_random_uuid(), '测试店铺A', '北京市朝阳区测试路123号', '13800138000', '09:00-22:00', '5.0', 0, false, NOW())
       RETURNING id`
    );
    shopRes.rows = [newShop.rows[0]];
  }
  const shopId = shopRes.rows[0].id;
  console.log('Using shopId:', shopId);

  // Insert new comment with Chinese text
  const newComment = await client.query(
    `INSERT INTO comments (id, shop_id, title, content, rating, like_count, created_at)
     VALUES (gen_random_uuid(), $1, '非常好的体验', '这家店的菜品非常新鲜，服务态度也很好，环境干净整洁，强烈推荐！', 5, 0, NOW())
     RETURNING id`,
    [shopId]
  );
  const commentId = newComment.rows[0].id;
  console.log('Created comment id:', commentId);

  await client.end();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  client.end();
});
