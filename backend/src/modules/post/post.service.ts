import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { Shop } from '../../entities/shop.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getRecommendations(
    lat?: number,
    lng?: number,
    page: number = 1,
    pageSize: number = 20,
  ) {
    const query = this.postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.shop', 'shop')
      .where('post.isRecommended = :isRecommended', { isRecommended: true })
      .orderBy('post.recommendRank', 'ASC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [posts, total] = await query.getManyAndCount();

    return {
      list: posts.map(post => this.formatPost(post)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author', 'shop'],
    });

    if (!post) {
      throw new HttpException('帖子不存在', HttpStatus.NOT_FOUND);
    }

    return this.formatPostDetail(post);
  }

  async getRelated(postId: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new HttpException('帖子不存在', HttpStatus.NOT_FOUND);
    }

    // 获取同分类或同城市的推荐
    const related = await this.postRepo.find({
      where: [
        { shopId: post.shopId, id: postId },
        { isRecommended: true },
      ],
      relations: ['author', 'shop'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return related
      .filter(p => p.id !== postId)
      .slice(0, 6)
      .map(post => this.formatPost(post));
  }

  async create(dto: any, authorId: string) {
    const post = this.postRepo.create({
      ...dto,
      authorId,
    });

    await this.postRepo.save(post);

    const saved = await this.postRepo.findOne({
      where: { id: post.id },
      relations: ['author', 'shop'],
    });

    return this.formatPost(saved);
  }

  private formatPost(post: Post) {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author ? {
        id: post.author.id,
        nickname: post.author.nickname,
        avatar: post.author.avatar,
      } : null,
      shopId: post.shopId,
      shopName: post.shop?.name,
      coverImage: post.coverImage,
      reviewCount: post.reviewCount,
      isRecommended: post.isRecommended,
      recommendRank: post.recommendRank,
      location: post.location,
      eventTime: post.eventTime,
      createdAt: post.createdAt,
    };
  }

  private formatPostDetail(post: Post) {
    return {
      ...this.formatPost(post),
      images: post.images,
      consumeRecord: post.consumeRecord,
      shop: post.shop ? {
        id: post.shop.id,
        name: post.shop.name,
        address: post.shop.address,
        coverImage: post.shop.coverImage,
        summaryTags: post.shop.summaryTags,
        reviewCount: post.shop.reviewCount,
      } : null,
    };
  }
}
