import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const nodeEnv = process.env.NODE_ENV || 'development';
process.env.NODE_ENV = nodeEnv;
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`), override: true });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';
import { getRequiredEnv, getRequiredNumberEnv, validateRequiredEnv } from './config/env';

async function bootstrap() {
  validateRequiredEnv();

  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // 系统静态资源（默认图片、字体等）
  app.use('/static', express.static(path.join(__dirname, '..', 'static')));
  
  const uploadDir = getRequiredEnv('UPLOAD_DIR');
  app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir.replace(/^\.\//, ''))));

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

  const port = getRequiredNumberEnv('PORT');
  await app.listen(port);
  console.log(`API 服务已启动，端口：${port}`);
  console.log(`WebSocket 服务已启动，路径：/ws/chat`);
}
bootstrap();
