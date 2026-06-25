// 配置文件 - 统一管理API地址
// 使用 localhost，小程序开发工具需要开启「不校验合法域名」
const API_BASE = 'http://localhost:3000';
const WS_BASE = 'ws://localhost:3000';

module.exports = {
  API_BASE,
  WS_BASE,
  API_URL: `${API_BASE}/api/v1`,
  WS_URL: `${WS_BASE}/ws/chat`
};
