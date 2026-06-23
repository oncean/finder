const request = require('../utils/request');

function getGroupInfo(groupId) {
  return request.get(`/chat/group/${groupId}`);
}

function getOnlineUsers(groupId) {
  return request.get(`/chat/group/${groupId}/online-users`);
}

function getMessages(groupId, lastId, limit = 20) {
  return request.get('/chat/messages', { groupId, lastId, limit });
}

function sendMessage(groupId, type, content, shopCard) {
  const body = { groupId, type, content };
  if (shopCard) {
    body.shopCard = shopCard;
  }
  return request.post('/chat/message/send', body);
}

module.exports = {
  getGroupInfo,
  getOnlineUsers,
  getMessages,
  sendMessage
};
