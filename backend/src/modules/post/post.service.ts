import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { Shop } from '../../entities/shop.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class PostService {
  private readonly staticBaseUrl =
    process.env.STATIC_BASE_URL || 'http://192.168.2.103/static';

  private get defaultFeedImage() {
    return `${this.staticBaseUrl}/default-feed.png`;
  }

  private get defaultShopImage() {
    return `${this.staticBaseUrl}/default-shop.png`;
  }

  private get defaultAvatarImage() {
    return `${this.staticBaseUrl}/default-avatar.png`;
  }

  private get feedFoodImages() {
    return [
      `${this.staticBaseUrl}/feed-food-1.jpg`,
      `${this.staticBaseUrl}/feed-food-2.jpg`,
      `${this.staticBaseUrl}/feed-receipt.jpg`,
    ];
  }

  private get feedAuthorImage() {
    return `${this.staticBaseUrl}/feed-author.jpg`;
  }

  private get feedShopImage() {
    return `${this.staticBaseUrl}/feed-shop.jpg`;
  }

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
    await this.ensureRecommendationSeedData();

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

    const savedPost = await this.postRepo.save(post) as unknown as Post;

    const found = await this.postRepo.findOne({
      where: { id: savedPost.id },
      relations: ['author', 'shop'],
    });

    return this.formatPost(found);
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
      shop: post.shop ? {
        id: post.shop.id,
        name: post.shop.name,
        address: post.shop.address,
        coverImage: post.shop.coverImage || this.feedShopImage,
        summaryTags: post.shop.summaryTags || {
          positive: ['重油重辣'],
          negative: ['太酸了'],
          averageCost: 22,
        },
        reviewCount: post.shop.reviewCount,
      } : null,
      images: Array.isArray(post.images) && post.images.length > 0 ? post.images : this.feedFoodImages,
      coverImage: post.coverImage || this.feedFoodImages[0],
      consumeRecord: post.consumeRecord,
      reviewCount: post.reviewCount,
      isRecommended: post.isRecommended,
      recommendRank: post.recommendRank,
      location: post.location,
      eventTime: post.eventTime,
      createdAt: post.createdAt,
    };
  }

  private formatPostDetail(post: Post) {
    const base = this.formatPost(post);
    return {
      ...base,
      images: Array.isArray(post.images) && post.images.length > 0
        ? post.images
        : this.reviewImages,
      consumeRecord: post.consumeRecord || {
        amount: 979.46,
        merchantName: post.shop?.name || '南京盐水鸭',
        tradeTime: '2025-01-24T19:30:00.000Z',
        tradeNo: 'MOCK20250124001',
        paymentMethod: '微信支付',
      },
      shop: post.shop ? {
        id: post.shop.id,
        name: post.shop.name,
        address: post.shop.address,
        coverImage: post.shop.coverImage || this.feedShopImage,
        summaryTags: post.shop.summaryTags || {
          positive: ['重油重辣'],
          negative: ['太酸了'],
          averageCost: 22,
        },
        reviewCount: post.shop.reviewCount || 2000,
      } : null,
      eventDate: post.eventTime
        ? this.formatEventDate(post.eventTime)
        : '01-24',
      eventLocation: post.location || '南京',
    };
  }

  private get reviewImages() {
    return [
      `${this.staticBaseUrl}/review-food-1.jpg`,
      `${this.staticBaseUrl}/review-food-2.jpg`,
      `${this.staticBaseUrl}/review-receipt.jpg`,
    ];
  }

  private formatEventDate(date: Date): string {
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}-${day}`;
  }

  private async ensureRecommendationSeedData() {
    await this.migrateLegacyStaticPaths();

    const existingCount = await this.postRepo.count({
      where: { isRecommended: true },
    });

    if (existingCount > 0) {
      return;
    }

    const author = await this.getOrCreateSeedAuthor();
    const shops = await Promise.all([
      this.getOrCreateSeedShop({
        name: '巷口老面馆',
        category: '面馆',
        address: '南京市玄武区珠江路 88 号',
        location: { lat: 32.0567, lng: 118.7921 },
        businessHours: '07:00-21:30',
        rating: 4.8,
        reviewCount: 128,
        summaryTags: {
          positive: ['汤底浓郁', '牛肉量足', '出餐快'],
          negative: ['饭点排队'],
          averageCost: 32,
        },
      }),
      this.getOrCreateSeedShop({
        name: '青柠泰式小馆',
        category: '东南亚菜',
        address: '南京市秦淮区科巷 12 号',
        location: { lat: 32.0412, lng: 118.7865 },
        businessHours: '11:00-22:00',
        rating: 4.7,
        reviewCount: 96,
        summaryTags: {
          positive: ['冬阴功酸辣', '环境清爽', '适合聚餐'],
          negative: ['座位偏少'],
          averageCost: 86,
        },
      }),
      this.getOrCreateSeedShop({
        name: '梧桐下咖啡',
        category: '咖啡甜品',
        address: '南京市鼓楼区上海路 45 号',
        location: { lat: 32.0622, lng: 118.7718 },
        businessHours: '09:00-23:00',
        rating: 4.9,
        reviewCount: 214,
        summaryTags: {
          positive: ['拿铁稳定', '甜品不腻', '适合办公'],
          negative: ['周末人多'],
          averageCost: 48,
        },
      }),
      this.getOrCreateSeedShop({
        name: '热辣巷子火锅',
        category: '火锅',
        address: '南京市建邺区江东中路 168 号',
        location: { lat: 32.0058, lng: 118.7376 },
        businessHours: '10:30-02:00',
        rating: 4.6,
        reviewCount: 302,
        summaryTags: {
          positive: ['锅底香', '菜品新鲜', '服务主动'],
          negative: ['晚高峰等位'],
          averageCost: 118,
        },
      }),
    ]);

    const posts = [
      {
        title: '南京这家店味道真不错',
        content: '味道和环境真的非常不错，适合打卡就餐，朋友聚会也很合适。',
        shop: shops[0],
        reviewCount: 36,
        recommendRank: 1,
        location: '玄武区 · 珠江路',
        amount: 32,
      },
      {
        title: '科巷这家泰式小馆，酸辣口很醒胃',
        content: '冬阴功汤味道比较正，柠檬叶和香茅味明显。咖喱鸡也不错，两三个人点一桌刚好。',
        shop: shops[1],
        reviewCount: 28,
        recommendRank: 2,
        location: '秦淮区 · 科巷',
        amount: 86,
      },
      {
        title: '适合下午办公的安静咖啡店',
        content: '靠窗位置光线很好，拿铁稳定，巴斯克不会太甜。插座比较多，下午坐两小时也舒服。',
        shop: shops[2],
        reviewCount: 52,
        recommendRank: 3,
        location: '鼓楼区 · 上海路',
        amount: 48,
      },
      {
        title: '夜宵火锅氛围很足，锅底越煮越香',
        content: '牛油锅底香气够，鸭血和毛肚表现不错。适合晚上朋友聚餐，建议提前取号。',
        shop: shops[3],
        reviewCount: 64,
        recommendRank: 4,
        location: '建邺区 · 江东中路',
        amount: 118,
      },
    ];

    for (const item of posts) {
      const exists = await this.postRepo.findOne({ where: { title: item.title } });
      if (exists) {
        continue;
      }

      await this.postRepo.save(this.postRepo.create({
        title: item.title,
        content: item.content,
        authorId: author.id,
        shopId: item.shop.id,
        images: this.feedFoodImages,
        coverImage: this.feedFoodImages[0],
        consumeRecord: {
          amount: item.amount,
          merchantName: item.shop.name,
          tradeTime: new Date().toISOString(),
          tradeNo: `MOCK${Date.now()}${item.recommendRank}`,
          paymentMethod: '微信支付',
        },
        reviewCount: item.reviewCount,
        isRecommended: true,
        recommendRank: item.recommendRank,
        location: item.location,
        eventTime: new Date(),
      }));
    }
  }

  private async getOrCreateSeedAuthor() {
    let author = await this.userRepo.findOne({
      where: { openid: 'mock_feed_author' },
    });

    if (!author) {
      author = await this.userRepo.save(this.userRepo.create({
        openid: 'mock_feed_author',
        nickname: '风向标探店员',
        avatar: this.feedAuthorImage,
        location: {
          lat: 32.0603,
          lng: 118.7969,
          city: '南京市',
        },
      }));
    }

    return author;
  }

  private async getOrCreateSeedShop(data: Partial<Shop>) {
    let shop = await this.shopRepo.findOne({
      where: { name: data.name },
    });

    if (!shop) {
      shop = await this.shopRepo.save(this.shopRepo.create({
        ...data,
        coverImage: this.feedShopImage,
        phone: '025-88888888',
        isVerified: true,
      }));
    }

    return shop;
  }

  private async migrateLegacyStaticPaths() {
    const legacyAvatar = '/static/images/default-avatar.png';
    const legacyFeed = '/static/images/default-feed.png';
    const legacyShop = '/static/images/default-shop.png';

    await this.migrateDemoContent();

    await this.userRepo.update(
      { avatar: legacyAvatar },
      { avatar: this.feedAuthorImage },
    );
    await this.userRepo.update(
      { avatar: this.defaultAvatarImage },
      { avatar: this.feedAuthorImage },
    );
    await this.shopRepo.update(
      { coverImage: legacyShop },
      { coverImage: this.feedShopImage },
    );
    await this.shopRepo.update(
      { coverImage: this.defaultShopImage },
      { coverImage: this.feedShopImage },
    );

    const legacyPosts = await this.postRepo
      .createQueryBuilder('post')
      .where('post.coverImage = :coverImage', { coverImage: legacyFeed })
      .orWhere('post.coverImage = :defaultFeedImage', { defaultFeedImage: this.defaultFeedImage })
      .orWhere(`post.images::text LIKE :imagePattern`, {
        imagePattern: `%${legacyFeed}%`,
      })
      .orWhere(`post.images::text LIKE :defaultImagePattern`, {
        defaultImagePattern: `%${this.defaultFeedImage}%`,
      })
      .getMany();

    for (const post of legacyPosts) {
      let changed = false;

      if (post.coverImage === legacyFeed || post.coverImage === this.defaultFeedImage) {
        post.coverImage = this.feedFoodImages[0];
        changed = true;
      }

      if (
        Array.isArray(post.images) &&
        (post.images.includes(legacyFeed) || post.images.includes(this.defaultFeedImage))
      ) {
        post.images = this.feedFoodImages;
        changed = true;
      }

      if (changed) {
        await this.postRepo.save(post);
      }
    }
  }

  private async migrateDemoContent() {
    const demoPost = await this.postRepo.findOne({
      where: { title: '这碗牛肉面可以冲，汤底很稳' },
      relations: ['shop'],
    });

    if (demoPost) {
      demoPost.title = '南京这家店味道真不错';
      demoPost.content = '味道和环境真的非常不错，适合打卡就餐，朋友聚会也很合适。';
      demoPost.reviewCount = 2000;
      demoPost.location = '南京';
      demoPost.consumeRecord = {
        ...demoPost.consumeRecord,
        amount: 115000,
        merchantName: '南京盐水鸭',
      };
      await this.postRepo.save(demoPost);

      if (demoPost.shop) {
        demoPost.shop.name = '南京盐水鸭';
        demoPost.shop.category = '南京菜';
        demoPost.shop.address = '南京市玄武区/距您300米';
        demoPost.shop.coverImage = this.feedShopImage;
        demoPost.shop.reviewCount = 2000;
        demoPost.shop.summaryTags = {
          positive: ['重油重辣'],
          negative: ['太酸了'],
          averageCost: 22,
        };
        await this.shopRepo.save(demoPost.shop);
      }
    }
  }
}
