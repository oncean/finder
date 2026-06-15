const request = require('../utils/request');

function getGroupInfo(groupId) {
  return request.get(`/chat/group/${groupId}`);
}

function getMessages(groupId, lastId, limit = 20) {
  return request.get('/chat/messages', { groupId, lastId, limit });
}

function sendMessage(groupId, type, content) {
  return request.post('/chat/message/send', { groupId, type, content });
}

module.exports = {
  getGroupInfo,
  getMessages,
  sendMessage
};
