import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Comment } from '../../entities/comment.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
  ) {}

  async getRecommendations(
    lat?: number,
    lng?: number,
    page: number = 1,
    pageSize: number = 20,
  ) {
    const query = this.commentRepo.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .leftJoinAndSelect('comment.shop', 'shop')
      .where('comment.isFengxiangbiao = :isFengxiangbiao', { isFengxiangbiao: true })
      .orderBy('comment.fengxiangbiaoRank', 'ASC')
      .addOrderBy('comment.rating', 'DESC')
      .addOrderBy('comment.likeCount', 'DESC')
      .addOrderBy('comment.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [comments, total] = await query.getManyAndCount();

    // 批量获取每个店铺的评论头像（最多4个）
    const shopIds = [...new Set(comments.map(c => c.shopId).filter(Boolean))];
    const shopAvatarsMap = new Map<string, string[]>();

    if (shopIds.length > 0) {
      const shopComments = await this.commentRepo.find({
        where: { shopId: In(shopIds) },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });

      for (const shopId of shopIds) {
        const avatars = shopComments
          .filter(c => c.shopId === shopId)
          .slice(0, 4)
          .map(c => c.author?.avatar)
          .filter(Boolean);
        shopAvatarsMap.set(shopId, avatars);
      }
    }

    return {
      list: comments.map(comment => this.formatComment(comment, shopAvatarsMap.get(comment.shopId) || [])),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const comment = await this.commentRepo.findOne({
      where: { id },
      relations: ['author', 'shop'],
    });

    if (!comment) {
      throw new HttpException('评价不存在', HttpStatus.NOT_FOUND);
    }

    return this.formatComment(comment);
  }

  async getRelated(commentId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });

    if (!comment) {
      throw new HttpException('评价不存在', HttpStatus.NOT_FOUND);
    }

    const related = await this.commentRepo.find({
      where: { shopId: comment.shopId },
      relations: ['author', 'shop'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return related
      .filter(item => item.id !== commentId)
      .slice(0, 6)
      .map(item => this.formatComment(item));
  }

  async create(dto: any, authorId: string) {
    const commentData: Partial<Comment> = {
      ...dto,
      authorId,
      isFengxiangbiao: false,
      fengxiangbiaoRank: null,
    };
    const comment = this.commentRepo.create(commentData);

    const saved = await this.commentRepo.save(comment);

    return this.findOne(saved.id);
  }

  private formatComment(comment: Comment, commentAvatars: string[] = []) {
    const shop = comment.shop;
    const author = comment.author;
    const images = Array.isArray(comment.images) ? comment.images : [];

    return {
      id: comment.id,
      commentId: comment.id,
      title: comment.title,
      content: comment.content,
      author: author ? {
        id: author.id,
        nickname: author.nickname,
        avatar: author.avatar,
      } : null,
      shopId: comment.shopId,
      shopName: shop?.name,
      shop: shop ? {
        id: shop.id,
        name: shop.name,
        address: shop.address,
        coverImage: shop.coverImage || '',
        summaryTags: shop.summaryTags,
        reviewCount: shop.reviewCount,
        commentAvatars,
      } : null,
      images,
      coverImage: images[0] || shop?.coverImage || '',
      consumeRecord: comment.consumeRecord
        ? {
            amount: comment.consumeRecord.amount,
            merchantName: shop?.name || '',
            tradeTime: comment.consumeRecord.tradeTime,
            tradeNo: `COMMENT-${comment.id}`,
            image: comment.consumeRecord.image,
          }
        : null,
      reviewCount: shop?.reviewCount || 0,
      rating: comment.rating,
      likeCount: comment.likeCount,
      isRecommended: comment.isFengxiangbiao,
      recommendRank: comment.fengxiangbiaoRank,
      location: shop?.address,
      city: shop?.city,
      eventTime: comment.createdAt,
      createdAt: comment.createdAt,
    };
  }
}
