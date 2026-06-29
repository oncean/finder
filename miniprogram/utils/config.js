const VERSION_ENV_MAP = {
  develop: 'dev',
  trial: 'test',
  release: 'prod'
};

const ENV_CONFIG = {
  dev: {
    API_BASE: 'http://192.168.0.2:3000',
    WS_BASE: 'ws://192.168.0.2:3000'
  },
  test: {
    API_BASE: 'https://test-api.example.com',
    WS_BASE: 'wss://test-api.example.com'
  },
  prod: {
    API_BASE: 'https://api.example.com',
    WS_BASE: 'wss://api.example.com'
  }
};

const wxEnvVersion = typeof __wxConfig !== 'undefined' && __wxConfig.envVersion
  ? __wxConfig.envVersion
  : 'develop';
const ENV = VERSION_ENV_MAP[wxEnvVersion] || 'dev';
const currentConfig = ENV_CONFIG[ENV];

if (!currentConfig) {
  throw new Error(`未知小程序运行环境：${ENV}`);
}

const { API_BASE, WS_BASE } = currentConfig;

module.exports = {
  ENV,
  API_BASE,
  WS_BASE,
  API_URL: `${API_BASE}/api/v1`,
  WS_URL: `${WS_BASE}/ws/chat`
};
