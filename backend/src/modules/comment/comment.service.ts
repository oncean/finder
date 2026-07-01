import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Comment } from '../../entities/comment.entity';
import { assertCanDeleteEntity } from '../../common/utils/delete-dependency.util';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
    private dataSource: DataSource,
    private storageService: StorageService,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    keyword?: string,
    shopId?: string,
    authorId?: string,
    isFengxiangbiao?: string,
    id?: string,
  ) {
    const query = this.commentRepo.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.shop', 'shop')
      .leftJoinAndSelect('comment.author', 'author');

    if (id) {
      query.andWhere('comment.id = :id', { id });
    }

    if (keyword) {
      query.andWhere('comment.title LIKE :keyword OR comment.content LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    if (shopId) {
      query.andWhere('comment.shopId = :shopId', { shopId });
    }

    if (authorId) {
      query.andWhere('comment.authorId = :authorId', { authorId });
    }

    if (isFengxiangbiao !== undefined) {
      query.andWhere('comment.isFengxiangbiao = :isFengxiangbiao', {
        isFengxiangbiao: isFengxiangbiao === 'true',
      });
    }

    const [list, total] = await query
      .addSelect(
        'CASE WHEN comment.fengxiangbiaoRank IS NULL THEN 1 ELSE 0 END',
        'comment_fengxiangbiao_rank_is_null',
      )
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('comment_fengxiangbiao_rank_is_null', 'ASC')
      .addOrderBy('comment.fengxiangbiaoRank', 'ASC')
      .addOrderBy('comment.createdAt', 'DESC')
      .getManyAndCount();

    this.logger.log(`findAll: page=${page}, limit=${limit}, keyword=${keyword || 'null'}, shopId=${shopId || 'null'}, authorId=${authorId || 'null'}, isFengxiangbiao=${isFengxiangbiao || 'null'}, total=${total}`);

    return { list: await Promise.all(list.map(c => this.formatComment(c))), total };
  }

  async findOne(id: string) {
    this.logger.log(`findOne: commentId=${id}`);
    const comment = await this.commentRepo.findOne({
      where: { id },
      relations: ['shop', 'author'],
    });
    return comment ? await this.formatComment(comment) : null;
  }

  private async formatComment(comment: Comment) {
    return {
      ...comment,
      images: Array.isArray(comment.images) ? comment.images : [],
      consumeRecord: comment.consumeRecord
        ? {
            ...comment.consumeRecord,
          }
        : null,
      shop: comment.shop ? {
        ...comment.shop,
      } : null,
      author: comment.author ? {
        ...comment.author,
      } : null,
    };
  }

  async update(id: string, data: Partial<Comment>) {
    await this.commentRepo.update(id, data);
    return this.findOne(id);
  }

  async create(data: Partial<Comment>) {
    if (!data.authorId) {
      throw new BadRequestException('用户ID不能为空');
    }
    const comment = this.commentRepo.create({
      shopId: data.shopId,
      authorId: data.authorId,
      title: data.title,
      content: data.content,
      rating: data.rating || 5,
      images: data.images || [],
      consumeRecord: data.consumeRecord,
      likeCount: data.likeCount || 0,
      isFengxiangbiao: data.isFengxiangbiao ?? false,
      fengxiangbiaoRank: data.fengxiangbiaoRank ?? null,
    });
    await this.commentRepo.save(comment);
    return this.findOne(comment.id);
  }

  async delete(id: string) {
    this.logger.log(`delete: commentId=${id}`);
    const comment = await this.commentRepo.findOne({ where: { id } });

    if (!comment) {
      this.logger.warn(`delete: 评价不存在, commentId=${id}`);
      throw new NotFoundException('评价不存在');
    }

    await assertCanDeleteEntity(this.dataSource, this.commentRepo.metadata, id, '评价');
    await this.commentRepo.remove(comment);
    this.logger.log(`delete: 评价删除成功, commentId=${id}`);
    return { message: '评价删除成功' };
  }

  async batchUpdateFengxiangbiaoRank(rankings: Array<{ id: string; rank: number }>) {
    this.logger.log(`batchUpdateFengxiangbiaoRank: ${JSON.stringify(rankings)}`);
    
    for (const item of rankings) {
      await this.commentRepo.update(item.id, {
        fengxiangbiaoRank: item.rank,
      });
    }
    
    return { message: '排名更新成功' };
  }
}
