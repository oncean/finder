import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { ShopModule } from './modules/shop/shop.module';
import { PostModule } from './modules/post/post.module';
import { UploadModule } from './modules/upload/upload.module';
import { ChatGateway } from './websocket/chat.gateway';
import { User } from './entities/user.entity';
import { Shop } from './entities/shop.entity';
import { Post } from './entities/post.entity';
import { Message } from './entities/message.entity';
import { Review } from './entities/review.entity';
import { ChatGroup } from './entities/chat-group.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER || 'app',
      password: process.env.DB_PASSWORD || 'dev123456',
      database: process.env.DB_NAME || 'fengxiangbiao',
      entities: [User, Shop, Post, Message, Review, ChatGroup],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    ChatModule,
    ShopModule,
    PostModule,
    UploadModule,
  ],
  providers: [ChatGateway],
})
export class AppModule {}
