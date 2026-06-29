import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../../entities/shop.entity';
import { Comment } from '../../entities/comment.entity';

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>,
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
  ) {}

  async findNearby(
    lat: number,
    lng: number,
    radius: number = 3000,
    keyword?: string,
    page: number = 1,
    pageSize: number = 20,
  ) {
    const query = this.shopRepo.createQueryBuilder('shop')
      .select([
        'shop.id',
        'shop.name',
        'shop.category',
        'shop.address',
        'shop.location',
        'shop.city',
        'shop.coverImage',
        'shop.logo',
        'shop.rating',
        'shop.reviewCount',
        'shop.summaryTags',
        'shop.isVerified',
      ]);

    // 关键词搜索（跨数据库兼容写法）
    if (keyword) {
      query.where(
        '(LOWER(shop.name) LIKE LOWER(:keyword) OR LOWER(shop.address) LIKE LOWER(:keyword))',
        { keyword: `%${keyword}%` },
      );
    }

    query.orderBy('shop.reviewCount', 'DESC');

    const shops = await query.getMany();
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
    const filteredShops = hasLocation
      ? shops
          .map((shop) => ({
            shop,
            distance: shop.location ? this.calculateDistance(lat, lng, shop.location) : null,
          }))
          .filter((item) => item.distance !== null && item.distance <= radius)
          .sort((a, b) => a.distance - b.distance)
      : shops.map((shop) => ({ shop, distance: null }));

    const total = filteredShops.length;
    const pagedShops = filteredShops.slice((page - 1) * pageSize, page * pageSize);

    this.logger.log(`findNearby: lat=${lat}, lng=${lng}, radius=${radius}, keyword=${keyword || 'null'}, total=${total}`);

    return {
      list: pagedShops.map(({ shop, distance }) => ({
        ...shop,
        distance,
      })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    this.logger.log(`findOne: shopId=${id}`);
    const shop = await this.shopRepo.findOne({ where: { id } });
    if (!shop) {
      this.logger.warn(`findOne: 店铺不存在, shopId=${id}`);
      throw new HttpException('店铺不存在', HttpStatus.NOT_FOUND);
    }

    // 查询评论总数
    const commentCount = await this.commentRepo.count({ where: { shopId: id } });

    // 查询前4条评论的作者头像
    const recentComments = await this.commentRepo.find({
      where: { shopId: id },
      order: { createdAt: 'DESC' },
      take: 4,
      relations: ['author'],
    });
    const avatarIds = recentComments.map(c => c.author?.avatar).filter(Boolean);
    const recommendations = await this.findRelatedShops(shop);

    return {
      id: shop.id,
      name: shop.name,
      category: shop.category,
      address: shop.address,
      coverImage: shop.coverImage || shop.logo || '',
      phone: shop.phone,
      businessHours: shop.businessHours,
      rating: shop.rating,
      reviewCount: shop.reviewCount || commentCount,
      commentCount,
      commentAvatars: avatarIds,
      summaryTags: shop.summaryTags,
      isVerified: shop.isVerified,
      location: shop.location,
      subtitle: [shop.category, shop.address].filter(Boolean).join(' · '),
      rankText: null,
      testerCount: commentCount || shop.reviewCount || 0,
      paymentRecord: null,
      recommendations,
    };
  }

  async getReviews(shopId: string, page: number = 1, pageSize: number = 20) {
    this.logger.log(`getReviews: shopId=${shopId}, page=${page}, pageSize=${pageSize}`);
    const [comments, total] = await this.commentRepo.findAndCount({
      where: { shopId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['author'],
    });

    this.logger.log(`getReviews: shopId=${shopId}, total=${total}`);

    return {
      list: comments.map(comment => ({
        id: comment.id,
        author: {
          id: comment.author.id,
          nickname: comment.author.nickname,
          avatar: comment.author.avatar || '',
        },
        title: comment.title,
        content: comment.content,
        images: Array.isArray(comment.images) ? comment.images : [],
        rating: comment.rating,
        consumeRecord: comment.consumeRecord || null,
        likeCount: comment.likeCount,
        createdAt: comment.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  private calculateDistance(lat: number, lng: number, location: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = ((location.lat - lat) * Math.PI) / 180;
    const dLon = ((location.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) * Math.cos((location.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 1000);
  }

  private async findRelatedShops(shop: Shop) {
    const query = this.shopRepo.createQueryBuilder('related')
      .select([
        'related.id',
        'related.name',
        'related.category',
        'related.address',
        'related.coverImage',
        'related.logo',
        'related.rating',
        'related.reviewCount',
      ])
      .where('related.id != :id', { id: shop.id });

    if (shop.category) {
      query.addOrderBy(
        'CASE WHEN related.category = :category THEN 0 ELSE 1 END',
        'ASC',
      ).setParameter('category', shop.category);
    }

    if (shop.city) {
      query.addOrderBy(
        'CASE WHEN related.city = :city THEN 0 ELSE 1 END',
        'ASC',
      ).setParameter('city', shop.city);
    }

    const relatedShops = await query
      .addOrderBy('related.reviewCount', 'DESC')
      .addOrderBy('related.rating', 'DESC')
      .addOrderBy('related.createdAt', 'DESC')
      .take(4)
      .getMany();

    return relatedShops.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      address: item.address,
      coverImage: item.coverImage || item.logo || '',
      reviewCount: item.reviewCount || 0,
      rating: item.rating,
    }));
  }
}
