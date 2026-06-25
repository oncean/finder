import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../../entities/shop.entity';
import { Comment } from '../../entities/comment.entity';

@Injectable()
export class ShopService {
  private readonly staticBaseUrl =
    process.env.STATIC_BASE_URL || 'http://192.168.2.103/static';

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
        'shop.coverImage',
        'shop.logo',
        'shop.rating',
        'shop.reviewCount',
        'shop.summaryTags',
        'shop.isVerified',
      ]);

    // 地理位置过滤
    if (lat && lng) {
      query.where(
        `ST_DWithin(
          shop.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        { lat, lng, radius },
      );
    }

    // 关键词搜索
    if (keyword) {
      query.andWhere(
        '(shop.name ILIKE :keyword OR shop.address ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 排序：距离优先
    if (lat && lng) {
      query.addSelect(
        `ST_Distance(
          shop.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'distance',
      )
      .orderBy('distance', 'ASC')
      .setParameter('lat', lat)
      .setParameter('lng', lng);
    } else {
      query.orderBy('shop.reviewCount', 'DESC');
    }

    // 分页
    query.skip((page - 1) * pageSize).take(pageSize);

    const [shops, total] = await query.getManyAndCount();

    return {
      list: shops.map(shop => ({
        ...shop,
        distance: lat && lng ? this.calculateDistance(lat, lng, shop.location) : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const shop = await this.shopRepo.findOne({ where: { id } });
    if (!shop) {
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
    const commentAvatars = recentComments
      .map(c => c.author?.avatar)
      .filter(Boolean);
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
      commentAvatars,
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
    const [comments, total] = await this.commentRepo.findAndCount({
      where: { shopId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['author'],
    });

    return {
      list: comments.map(comment => ({
        id: comment.id,
        author: {
          id: comment.author.id,
          nickname: comment.author.nickname,
          avatar: comment.author.avatar,
        },
        title: comment.title,
        content: comment.content,
        images: comment.images,
        rating: comment.rating,
        consumeRecord: comment.consumeRecord,
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

    return relatedShops.map((item) => ({
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
