import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WindVaneController } from './wind-vane.controller';
import { WindVaneService } from './wind-vane.service';
import { WindVane } from '../../entities/wind-vane.entity';
import { Comment } from '../../entities/comment.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([WindVane, Comment]), AuthModule],
  controllers: [WindVaneController],
  providers: [WindVaneService],
})
export class WindVaneModule {}
