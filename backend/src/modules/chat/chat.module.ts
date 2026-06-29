import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Message } from '../../entities/message.entity';
import { ChatGroup } from '../../entities/chat-group.entity';
import { User } from '../../entities/user.entity';
import { ChatOnlineUser } from '../../entities/chat-online-user.entity';
import { Shop } from '../../entities/shop.entity';
import { Comment } from '../../entities/comment.entity';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ChatGateway } from '../../websocket/chat.gateway';
import { ChatRealtimeService } from '../../websocket/chat-realtime.service';

@Module({
  imports: [TypeOrmModule.forFeature([Message, ChatGroup, User, ChatOnlineUser, Shop, Comment]), AuthModule, StorageModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatRealtimeService],
  exports: [ChatService, ChatRealtimeService],
})
export class ChatModule {}
