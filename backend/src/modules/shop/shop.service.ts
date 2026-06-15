import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../../entities/shop.entity';
import { Review } from '../../entities/review.entity';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>,
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
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

    return {
      id: shop.id,
      name: shop.name,
      category: shop.category,
      address: shop.address,
      coverImage: shop.coverImage,
      phone: shop.phone,
      businessHours: shop.businessHours,
      rating: shop.rating,
      reviewCount: shop.reviewCount,
      summaryTags: shop.summaryTags,
      isVerified: shop.isVerified,
    };
  }

  async getReviews(shopId: string, page: number = 1, pageSize: number = 20) {
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { shopId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['author'],
    });

    return {
      list: reviews.map(review => ({
        id: review.id,
        author: {
          id: review.author.id,
          nickname: review.author.nickname,
          avatar: review.author.avatar,
        },
        title: review.title,
        content: review.content,
        images: review.images,
        rating: review.rating,
        consumeRecord: review.consumeRecord,
        likeCount: review.likeCount,
        createdAt: review.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  private calculateDistance(lat: number, lng: number, location: string): number {
    // 简化计算，实际使用 PostGIS ST_Distance
    return 300; // 模拟距离
  }
}
