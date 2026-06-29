const VERSION_ENV_MAP = {
  develop: 'dev',
  trial: 'test',
  release: 'prod'
};

const ENV_CONFIG = {
  dev: {
    API_BASE: 'http://192.168.0.2:3000',
    WS_BASE: 'ws://192.168.0.2:3000',
    CLOUD_ENV_ID: 'prod-d0go4c43b289bc3bb',
    CLOUD_SERVICE: 'finder',
    USE_CLOUD_CONTAINER: true
  },
  test: {
    CLOUD_ENV_ID: 'prod-d0go4c43b289bc3bb',
    CLOUD_SERVICE: 'finder',
    USE_CLOUD_CONTAINER: true
  },
  prod: {
    CLOUD_ENV_ID: 'prod-d0go4c43b289bc3bb',
    CLOUD_SERVICE: 'finder',
    USE_CLOUD_CONTAINER: true
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

const {
  API_BASE = '',
  WS_BASE = '',
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  USE_CLOUD_CONTAINER,
} = currentConfig;

module.exports = {
  ENV,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  USE_CLOUD_CONTAINER,
  // 仅本地开发环境使用，线上走云托管不需要
  API_URL: `${API_BASE}/api/v1`,
  WS_URL: `${WS_BASE}/ws/chat`
};
