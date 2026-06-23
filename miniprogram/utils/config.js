// 配置文件 - 统一管理API地址
const API_BASE = 'http://127.0.0.1:3000';
const WS_BASE = 'ws://127.0.0.1:3002';

module.exports = {
  API_BASE,
  WS_BASE,
  API_URL: `${API_BASE}/api/v1`,
  WS_URL: `${WS_BASE}/ws/chat`
};
