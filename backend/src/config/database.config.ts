import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Shop } from '../entities/shop.entity';
import { Post } from '../entities/post.entity';
import { Message } from '../entities/message.entity';
import { Comment } from '../entities/comment.entity';
import { ChatGroup } from '../entities/chat-group.entity';
import { ChatOnlineUser } from '../entities/chat-online-user.entity';
import { Admin } from '../entities/admin.entity';
import { WindVane } from '../entities/wind-vane.entity';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'fengxiangbiao',
  entities: [User, Shop, Post, Message, Comment, ChatGroup, ChatOnlineUser, Admin, WindVane],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
});