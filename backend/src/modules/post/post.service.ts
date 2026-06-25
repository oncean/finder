import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../entities/comment.entity';

@Injectable()
export class PostService {
  private readonly staticBaseUrl =
    process.env.STATIC_BASE_URL || 'http://192.168.2.103/static';

  private get feedFoodImages() {
    return [
      `${this.staticBaseUrl}/feed-food-1.jpg`,
      `${this.staticBaseUrl}/feed-food-2.jpg`,
      `${this.staticBaseUrl}/feed-receipt.jpg`,
    ];
  }

  private get feedShopImage() {
    return `${this.staticBaseUrl}/feed-shop.jpg`;
  }

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

    return {
      list: comments.map(comment => this.formatComment(comment)),
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

  private formatComment(comment: Comment) {
    const shop = comment.shop;
    const author = comment.author;
    const images = Array.isArray(comment.images) && comment.images.length > 0
      ? comment.images
      : this.feedFoodImages;

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
        coverImage: shop.coverImage || this.feedShopImage,
        summaryTags: shop.summaryTags || {
          positive: ['真实评价', '高分推荐'],
          negative: [],
        },
        reviewCount: shop.reviewCount,
      } : null,
      images,
      coverImage: images[0] || shop?.coverImage || this.feedFoodImages[0],
      consumeRecord: comment.consumeRecord
        ? {
            amount: comment.consumeRecord.amount,
            merchantName: shop?.name || '',
            tradeTime: comment.consumeRecord.tradeTime,
            tradeNo: `COMMENT-${comment.id}`,
            paymentMethod: '微信支付',
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
