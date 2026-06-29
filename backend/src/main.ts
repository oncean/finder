import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const nodeEnv = process.env.NODE_ENV || 'development';
process.env.NODE_ENV = nodeEnv;
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`), override: true });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';
import { validateRequiredEnv } from './config/env';
import { existsSync, mkdirSync } from 'fs';
import { getSnowflakeWorkerInfo } from './common/utils/snowflake.util';

function logAllEnv(logger: Logger) {
  logger.log('容器环境变量开始');
  Object.keys(process.env)
    .sort()
    .forEach((key) => {
      logger.log(`${key}=${process.env[key] ?? ''}`);
    });
  logger.log('容器环境变量结束');
}

async function bootstrap() {
  validateRequiredEnv();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  app.useWebSocketAdapter(new WsAdapter(app));

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // HTTP 请求日志中间件
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logger = new Logger('HTTP');
      logger.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // 系统静态资源（默认图片、字体等）
  app.use('/static', express.static(path.join(__dirname, '..', 'static')));

  if ((process.env.STORAGE_MODE || 'cloud').toLowerCase() === 'local') {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    app.use('/uploads', express.static(path.resolve(uploadDir)));
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api/v1');

  // 管理后台前端静态资源（合并部署时启用）
  app.use('/', express.static(path.join(__dirname, '..', 'admin')));

  // SPA fallback：前端路由刷新时返回 index.html，排除 API/WebSocket/上传/系统静态资源路径
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/ws/') ||
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/static/')
    ) {
      return next();
    }
    res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  const snowflakeWorkerInfo = getSnowflakeWorkerInfo();
  logger.log(`API 服务已启动，端口：${port}`);
  logger.log(`WebSocket 服务已启动，路径：/ws/chat`);
  logger.log(`运行环境：${process.env.NODE_ENV}`);
  logger.log(`数据库：${process.env.DB_TYPE || 'postgres'}://${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`);
  logger.log(`Snowflake Worker ID：${snowflakeWorkerInfo.workerId}，来源：${snowflakeWorkerInfo.source}=${snowflakeWorkerInfo.sourceValue}`);
  logAllEnv(logger);
}

bootstrap();
