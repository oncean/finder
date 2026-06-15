const request = require('../utils/request');

function login(code) {
  return request.post('/auth/login', { code });
}

function checkLogin() {
  return request.get('/user/me');
}

module.exports = {
  login,
  checkLogin
};
