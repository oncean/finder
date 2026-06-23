import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { HomeController } from './home.controller';
import { User } from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { Post } from '../../entities/post.entity';
import { Shop } from '../../entities/shop.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Admin, Post, Shop]), AuthModule],
  controllers: [HomeController, AdminController],
})
export class AdminModule {}
