const request = require('../utils/request');

function getGroupInfo(groupId, location) {
  const params = location && location.lat && location.lng
    ? { lat: location.lat, lng: location.lng }
    : undefined;
  return request.get(`/chat/group/${groupId}`, params);
}

function getOnlineUsers(groupId) {
  return request.get(`/chat/group/${groupId}/online-users`);
}

function getMessages(groupId, lastId, limit = 100) {
  return request.get('/chat/messages', { groupId, lastId, limit });
}

function poll(groupId, lastSeenId) {
  return request.get('/chat/poll', { groupId, lastSeenId });
}

function sendMessage(groupId, type, content, shopCard, tempId) {
  const body = { groupId, type, content };
  if (shopCard) {
    body.shopCard = shopCard;
  }
  if (tempId) {
    body.tempId = tempId;
  }
  return request.post('/chat/message/send', body);
}

module.exports = {
  getGroupInfo,
  getOnlineUsers,
  getMessages,
  poll,
  sendMessage
};
