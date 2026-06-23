import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { ShopModule } from './modules/shop/shop.module';
import { PostModule } from './modules/post/post.module';
import { UploadModule } from './modules/upload/upload.module';
import { AdminModule } from './modules/admin/admin.module';
import { WindVaneModule } from './modules/wind-vane/wind-vane.module';
import { CommentModule } from './modules/comment/comment.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    AuthModule,
    ChatModule,
    ShopModule,
    PostModule,
    UploadModule,
    AdminModule,
    WindVaneModule,
    CommentModule,
  ],
})
export class AppModule {}