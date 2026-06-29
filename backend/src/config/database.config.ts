import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Shop } from '../entities/shop.entity';
import { Message } from '../entities/message.entity';
import { Comment } from '../entities/comment.entity';
import { ChatGroup } from '../entities/chat-group.entity';
import { ChatOnlineUser } from '../entities/chat-online-user.entity';
import { Admin } from '../entities/admin.entity';
import { getRequiredEnv, getRequiredNumberEnv, isProduction } from './env';

export const databaseConfig = (): TypeOrmModuleOptions => {
  const dbType = (process.env.DB_TYPE || 'postgres') as 'postgres' | 'mysql';

  return {
    type: dbType,
    host: getRequiredEnv('DB_HOST'),
    port: getRequiredNumberEnv('DB_PORT'),
    username: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    database: getRequiredEnv('DB_NAME'),
    entities: [User, Shop, Message, Comment, ChatGroup, ChatOnlineUser, Admin],
    synchronize: !isProduction(),
    logging: false,
  };
};
