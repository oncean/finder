import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../entities/comment.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
  ) {}

  async findAll(page = 1, limit = 10, keyword?: string, shopId?: string) {
    const query = this.commentRepo.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.shop', 'shop');

    if (keyword) {
      query.andWhere('comment.title LIKE :keyword OR comment.content LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    if (shopId) {
      query.andWhere('comment.shopId = :shopId', { shopId });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('comment.createdAt', 'DESC')
      .getManyAndCount();

    return { success: true, data, total };
  }

  async findOne(id: string) {
    return this.commentRepo.findOne({
      where: { id },
      relations: ['shop'],
    });
  }

  async update(id: string, data: Partial<Comment>) {
    await this.commentRepo.update(id, data);
    return this.findOne(id);
  }

  async create(data: Partial<Comment>) {
    // 获取第一个管理员作为作者，或创建一个系统用户ID
    const comment = this.commentRepo.create({
      shopId: data.shopId,
      authorId: data.authorId || null,
      title: data.title,
      content: data.content,
      rating: data.rating || 5,
      images: data.images || [],
      consumeRecord: data.consumeRecord,
      likeCount: 0,
    });
    await this.commentRepo.save(comment);
    return this.findOne(comment.id);
  }

  async delete(id: string) {
    await this.commentRepo.delete(id);
    return { success: true };
  }
}
