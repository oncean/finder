import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { HomeController } from './home.controller';
import { User } from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { Shop } from '../../entities/shop.entity';
import { Message } from '../../entities/message.entity';
import { ChatGroup } from '../../entities/chat-group.entity';
import { ChatOnlineUser } from '../../entities/chat-online-user.entity';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Admin, Shop, Message, ChatGroup, ChatOnlineUser]), AuthModule, ChatModule, StorageModule],
  controllers: [HomeController, AdminController],
})
export class AdminModule {}
