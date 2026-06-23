import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostController } from './post.controller';
import { FeedController } from './feed.controller';
import { PostService } from './post.service';
import { Post } from '../../entities/post.entity';
import { Shop } from '../../entities/shop.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Shop, User]), AuthModule],
  controllers: [PostController, FeedController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
