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

  // 用户1到用户15的ID（按创建时间排序）
  const userIds = [
    '7b4c4f22-c519-4346-ae42-8f3fecf37a1a', // 用户izgbiq
    '2d1ff465-efb9-4f80-8c1f-62d389071540', // 用户01
    'b06b8354-a948-489a-98eb-7ebdb8fcc0bf', // 用户02
    'dc19f5f1-52e5-4b75-ab42-88818b215b2f', // 用户03
    '654e646f-3388-4fcb-8342-192161bdeb13', // 用户04
    '9a966ea4-fad3-4148-9aed-8b5d71be0e69', // 用户05
    '79dd6b1e-f7c3-406c-b5a9-7a09096131a5', // 用户06
    'cd8cc759-36ca-471c-8eba-f5e30c6a0042', // 用户07
    'd2dcfeee-3f60-4859-b069-069eaf04153e', // 用户08
    '98f358df-21d4-45b6-83f9-47cfe5bb99d4', // 用户09
    '70c9a084-9ace-49df-b2bc-a6fc12a87987', // 用户10
    '84c920f6-23e5-4006-924f-a4889861a3cc', // 用户11
    '8f970491-69df-4b4b-bc82-cccf25f93244', // 用户12
    '9223fc70-e64f-47cd-a538-8d3eaeec63fa', // 用户13
    'b90fc22d-1d3c-4483-97ee-e9e1aec83e24', // 用户14
  ];

  // 先删除关联数据（消息、评论等），再删除用户
  // 删除 messages 中 senderId 为这些用户的记录
  const msgResult = await client.query(
    `DELETE FROM messages WHERE "senderId" IN (${userIds.map((_, i) => `$${i + 1}`).join(', ')})`,
    userIds
  );
  console.log(`删除了 ${msgResult.rowCount} 条关联消息`);

  // 删除 comments 中 userId 为这些用户的记录
  const commentResult = await client.query(
    `DELETE FROM comments WHERE "userId" IN (${userIds.map((_, i) => `$${i + 1}`).join(', ')})`,
    userIds
  );
  console.log(`删除了 ${commentResult.rowCount} 条关联评论`);

  // 删除 chat_online_users 中 userId 为这些用户的记录
  const onlineResult = await client.query(
    `DELETE FROM chat_online_users WHERE "userId" IN (${userIds.map((_, i) => `$${i + 1}`).join(', ')})`,
    userIds
  );
  console.log(`删除了 ${onlineResult.rowCount} 条在线用户记录`);

  // 删除 posts 中 authorId 为这些用户的记录
  const postResult = await client.query(
    `DELETE FROM posts WHERE "authorId" IN (${userIds.map((_, i) => `$${i + 1}`).join(', ')})`,
    userIds
  );
  console.log(`删除了 ${postResult.rowCount} 条关联帖子`);

  // 删除 reviews 中 userId 为这些用户的记录
  try {
    const reviewResult = await client.query(
      `DELETE FROM reviews WHERE "userId" IN (${userIds.map((_, i) => `$${i + 1}`).join(', ')})`,
      userIds
    );
    console.log(`删除了 ${reviewResult.rowCount} 条关联评价`);
  } catch (e) {
    console.log('reviews 表不存在或无关联数据，跳过');
  }

  // 最后删除用户
  const userResult = await client.query(
    `DELETE FROM users WHERE id IN (${userIds.map((_, i) => `$${i + 1}`).join(', ')})`,
    userIds
  );
  console.log(`删除了 ${userResult.rowCount} 个用户`);

  await client.end();
  console.log('完成！');
}

main().catch(console.error);
