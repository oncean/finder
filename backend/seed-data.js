const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'fengxiangbiao'
});

const shops = [
  {
    name: '老北京炸酱面馆',
    category: '中餐',
    address: '北京市东城区南锣鼓巷88号',
    phone: '010-12345678',
    businessHours: '10:00-22:00',
    rating: '4.8',
    reviewCount: 0,
    isVerified: true
  },
  {
    name: '星巴克咖啡（三里屯店）',
    category: '咖啡',
    address: '北京市朝阳区三里屯路19号',
    phone: '010-87654321',
    businessHours: '07:00-23:00',
    rating: '4.5',
    reviewCount: 0,
    isVerified: true
  },
  {
    name: '海底捞火锅（国贸店）',
    category: '火锅',
    address: '北京市朝阳区建国路88号',
    phone: '010-56781234',
    businessHours: '10:00-03:00',
    rating: '4.9',
    reviewCount: 0,
    isVerified: true
  }
];

const comments = [
  { title: '味道正宗', content: '炸酱面非常地道，面条劲道，酱料浓郁，配菜也很新鲜，强烈推荐！', rating: 5 },
  { title: '环境不错', content: '店面装修很有老北京风情，服务员态度热情，上菜速度快。', rating: 4 },
  { title: '性价比高', content: '价格很实惠，分量足，两个人吃得很饱，下次还会再来。', rating: 5 },
  { title: '咖啡香浓', content: '拿铁口感丝滑，咖啡豆香气浓郁，环境安静适合办公。', rating: 5 },
  { title: '服务周到', content: '店员很专业，会根据口味推荐饮品，座位舒适，WiFi速度快。', rating: 4 },
  { title: '下午茶首选', content: '抹茶星冰乐太好喝了，甜点也很精致，和朋友聚会的好地方。', rating: 5 },
  { title: '火锅之王', content: '服务简直无敌，等位时有小零食和饮料，锅底味道正宗，食材新鲜。', rating: 5 },
  { title: '生日体验', content: '过生日来海底捞，服务员唱歌跳舞，还送了长寿面，太感动了！', rating: 5 },
  { title: '家庭聚餐', content: '带父母来吃，老人很满意，有清淡的菌汤锅底，菜品丰富。', rating: 4 },
  { title: '夜宵好去处', content: '凌晨两点还能吃到热腾腾的火锅，服务态度依然很好，赞！', rating: 5 }
];

async function main() {
  await client.connect();

  // Insert shops
  const shopIds = [];
  for (const shop of shops) {
    const res = await client.query(
      `INSERT INTO shops (id, name, category, address, phone, business_hours, rating, review_count, is_verified, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [shop.name, shop.category, shop.address, shop.phone, shop.businessHours, shop.rating, shop.reviewCount, shop.isVerified]
    );
    shopIds.push(res.rows[0].id);
    console.log('Created shop:', shop.name, 'id:', res.rows[0].id);
  }

  // Insert comments - distribute across shops
  const commentIds = [];
  for (let i = 0; i < comments.length; i++) {
    const shopId = shopIds[i % 3];
    const comment = comments[i];
    const res = await client.query(
      `INSERT INTO comments (id, shop_id, title, content, rating, like_count, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, NOW())
       RETURNING id`,
      [shopId, comment.title, comment.content, comment.rating]
    );
    commentIds.push(res.rows[0].id);
    console.log('Created comment', i + 1, ':', comment.title, 'for shop', shopId);
  }

  // Update shop review counts
  for (let i = 0; i < 3; i++) {
    const count = Math.ceil(10 / 3) + (i < 1 ? 0 : 0); // 4, 3, 3
    await client.query(
      'UPDATE shops SET review_count = $1 WHERE id = $2',
      [i === 0 ? 4 : i === 1 ? 3 : 3, shopIds[i]]
    );
  }

  await client.end();
  console.log('\nDone! Created 3 shops and 10 comments.');
}

main().catch(err => {
  console.error('Error:', err.message);
  client.end();
});
