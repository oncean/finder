import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedController } from './feed.controller';
import { PostService } from './post.service';
import { Comment } from '../../entities/comment.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Comment]), AuthModule],
  controllers: [FeedController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
