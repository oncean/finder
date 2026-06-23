const request = require('../utils/request');

function login(data) {
  return request.post('/auth/login', data);
}

function checkLogin() {
  return request.get('/auth/me');
}

function updateMe(data) {
  return request.put('/auth/me', data);
}

module.exports = {
  login,
  checkLogin,
  updateMe
};
