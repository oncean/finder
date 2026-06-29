const REQUIRED_ENV_KEYS = [
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'WX_APPID',
  'WX_SECRET',
] as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

export function getRequiredEnv(key: RequiredEnvKey): string {
  const value = process.env[key];

  if (value === undefined || value === '') {
    throw new Error(`缺少必填环境变量：${key}`);
  }

  return value;
}

export function getRequiredNumberEnv(key: RequiredEnvKey): number {
  const value = getRequiredEnv(key);
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`环境变量 ${key} 必须是数字`);
  }

  return numberValue;
}

export function validateRequiredEnv() {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value === '';
  });

  if (missingKeys.length > 0) {
    throw new Error(`缺少必填环境变量：${missingKeys.join(', ')}`);
  }
}

export function isProduction() {
  return getRequiredEnv('NODE_ENV') === 'production';
}
