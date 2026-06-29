const { Client } = require('pg');
const { generateSnowflakeId } = require('./scripts/snowflake.cjs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'fengxiangbiao'
});

async function main() {
  await client.connect();

  console.log('1. 删除所有评价 (comments)...');
  await client.query('DELETE FROM comments');
  console.log('   ✓ 评价已清空');

  console.log('2. 删除所有推荐/帖子 (posts)...');
  await client.query('DELETE FROM posts');
  console.log('   ✓ 帖子已清空');

  console.log('3. 查询现有店铺...');
  const shopsRes = await client.query('SELECT id, name FROM shops ORDER BY created_at DESC');
  const shops = shopsRes.rows;
  console.log(`   ✓ 找到 ${shops.length} 个店铺:`);
  shops.forEach(s => console.log(`     - ${s.name} (${s.id})`));

  if (shops.length === 0) {
    console.log('\n❌ 没有现有店铺，无法创建评价');
    await client.end();
    return;
  }

  console.log('\n4. 查询现有用户...');
  const usersRes = await client.query('SELECT id, nickname FROM users LIMIT 1');
  let defaultAuthorId = null;
  if (usersRes.rows.length > 0) {
    defaultAuthorId = usersRes.rows[0].id;
    console.log(`   ✓ 使用用户: ${usersRes.rows[0].nickname} (${defaultAuthorId})`);
  } else {
    console.log('   ⚠ 没有用户，创建系统用户...');
    const sysUserRes = await client.query(
      `INSERT INTO users (id, nickname, created_at)
       VALUES ($1, '系统用户', NOW())
       RETURNING id`,
      [generateSnowflakeId()]
    );
    defaultAuthorId = sysUserRes.rows[0].id;
    console.log(`   ✓ 创建系统用户: ${defaultAuthorId}`);
  }

  console.log('\n4. 创建新的评价数据...');
  const commentsData = [
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

  // 创建一些帖子(posts)作为评价的关联对象
  console.log('\n5. 创建帖子数据用于关联...');
  const postsData = [
    { title: '探店老北京炸酱面', content: '今天来打卡这家老北京炸酱面，味道真的很正宗！' },
    { title: '三里屯星巴克办公体验', content: '环境安静，咖啡好喝，适合带电脑来办公。' },
    { title: '海底捞生日聚餐', content: '朋友过生日选的海底捞，服务太周到了！' }
  ];

  const postIds = [];
  for (let i = 0; i < postsData.length; i++) {
    const post = postsData[i];
    const shopId = shops[i % shops.length].id;
    const res = await client.query(
      `INSERT INTO posts (id, title, content, author_id, shop_id, is_recommended, recommend_rank, created_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, NOW())
       RETURNING id`,
      [generateSnowflakeId(), post.title, post.content, defaultAuthorId, shopId, i + 1]
    );
    postIds.push(res.rows[0].id);
    console.log(`   ✓ 创建帖子: ${post.title} (${res.rows[0].id})`);
  }

  console.log('\n6. 创建评价并关联到帖子和店铺...');
  for (let i = 0; i < commentsData.length; i++) {
    const comment = commentsData[i];
    const shopId = shops[i % shops.length].id;
    const postId = postIds[i % postIds.length];
    const res = await client.query(
      `INSERT INTO comments (id, post_id, shop_id, title, content, rating, like_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, NOW())
       RETURNING id`,
      [generateSnowflakeId(), postId, shopId, comment.title, comment.content, comment.rating]
    );
    console.log(`   ✓ 评价 ${i + 1}: ${comment.title} -> 帖子 ${postId}, 店铺 ${shopId}`);
  }

  console.log('\n7. 更新店铺评价数量...');
  for (const shop of shops) {
    const countRes = await client.query(
      'SELECT COUNT(*) FROM comments WHERE shop_id = $1',
      [shop.id]
    );
    const count = parseInt(countRes.rows[0].count, 10);
    await client.query(
      'UPDATE shops SET review_count = $1 WHERE id = $2',
      [count, shop.id]
    );
    console.log(`   ✓ ${shop.name}: ${count} 条评价`);
  }

  console.log('\n✅ 完成！');
  console.log(`   - 删除并重建了 ${postsData.length} 个推荐帖子`);
  console.log(`   - 创建了 ${commentsData.length} 条评价`);
  console.log(`   - 评价已关联到现有 ${shops.length} 个店铺`);

  await client.end();
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  client.end();
});
