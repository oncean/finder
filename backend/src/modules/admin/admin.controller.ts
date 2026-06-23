import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { Shop } from '../../entities/shop.entity';
import { AuthGuard } from '../../common/guards/auth.guard';
import * as bcrypt from 'bcrypt';
import { Post as PostEntity } from '../../entities/post.entity';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    @InjectRepository(PostEntity)
    private postRepo: Repository<PostEntity>,
    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>,
  ) {}

  @Get('users')
  async getUsers(
    @Query('current') current: any = 1,
    @Query('pageSize') pageSize: any = 10,
    @Query('keyword') keyword: string = '',
  ) {
    const page = parseInt(current, 10) || 1;
    const limit = parseInt(pageSize, 10) || 10;
    const query = this.userRepo.createQueryBuilder('user');
    
    if (keyword) {
      query.where('user.nickname LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('user.phone LIKE :keyword', { keyword: `%${keyword}%` });
    }

    const [users, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      success: true,
      data: users.map(user => ({
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        openid: user.openid,
        unionid: user.unionid,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total,
    };
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    return {
      success: true,
      data: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        openid: user.openid,
        unionid: user.unionid,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Post('users')
  @HttpCode(HttpStatus.OK)
  async createUser(@Body() body: any) {
    const user = this.userRepo.create({
      nickname: body.nickname || '新用户',
      avatar: body.avatar,
      phone: body.phone,
      location: body.location,
      isAdmin: body.isAdmin || false,
    });

    await this.userRepo.save(user);

    return {
      success: true,
      message: '用户创建成功',
      data: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    };
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    if (body.nickname !== undefined) user.nickname = body.nickname;
    if (body.avatar !== undefined) user.avatar = body.avatar;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.location !== undefined) user.location = body.location;
    if (body.isAdmin !== undefined) user.isAdmin = body.isAdmin;

    await this.userRepo.save(user);

    return {
      success: true,
      message: '用户更新成功',
      data: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        isAdmin: user.isAdmin,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    await this.userRepo.remove(user);

    return {
      success: true,
      message: '用户删除成功',
    };
  }

  @Get('admins')
  async getAdmins(
    @Query('current') current: any = 1,
    @Query('pageSize') pageSize: any = 10,
    @Query('keyword') keyword: string = '',
  ) {
    const page = parseInt(current, 10) || 1;
    const limit = parseInt(pageSize, 10) || 10;
    const query = this.adminRepo.createQueryBuilder('admin');
    
    if (keyword) {
      query.where('admin.username LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('admin.nickname LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('admin.phone LIKE :keyword', { keyword: `%${keyword}%` });
    }

    const [admins, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('admin.createdAt', 'DESC')
      .getManyAndCount();

    return {
      success: true,
      data: admins.map(admin => ({
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        phone: admin.phone,
        permissions: admin.permissions,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      })),
      total,
    };
  }

  @Get('admins/:id')
  async getAdmin(@Param('id') id: string) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    
    if (!admin) {
      return { success: false, message: '管理员不存在' };
    }

    return {
      success: true,
      data: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        phone: admin.phone,
        permissions: admin.permissions,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    };
  }

  @Post('admins')
  @HttpCode(HttpStatus.OK)
  async createAdmin(@Body() body: any) {
    const existing = await this.adminRepo.findOne({ where: { username: body.username } });
    
    if (existing) {
      return { success: false, message: '用户名已存在' };
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const admin = this.adminRepo.create({
      username: body.username,
      password: hashedPassword,
      nickname: body.nickname || body.username,
      avatar: body.avatar,
      phone: body.phone,
      permissions: body.permissions || ['users', 'posts', 'shops'],
    });

    await this.adminRepo.save(admin);

    return {
      success: true,
      message: '管理员创建成功',
      data: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        phone: admin.phone,
        permissions: admin.permissions,
        createdAt: admin.createdAt,
      },
    };
  }

  @Put('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() body: any) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    
    if (!admin) {
      return { success: false, message: '管理员不存在' };
    }

    if (body.username !== undefined) {
      const existing = await this.adminRepo.findOne({ where: { username: body.username } });
      if (existing && existing.id !== id) {
        return { success: false, message: '用户名已存在' };
      }
      admin.username = body.username;
    }
    
    if (body.password !== undefined) {
      admin.password = await bcrypt.hash(body.password, 10);
    }
    
    if (body.nickname !== undefined) admin.nickname = body.nickname;
    if (body.avatar !== undefined) admin.avatar = body.avatar;
    if (body.phone !== undefined) admin.phone = body.phone;
    if (body.permissions !== undefined) admin.permissions = body.permissions;

    await this.adminRepo.save(admin);

    return {
      success: true,
      message: '管理员更新成功',
      data: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        phone: admin.phone,
        permissions: admin.permissions,
        updatedAt: admin.updatedAt,
      },
    };
  }

  @Delete('admins/:id')
  async deleteAdmin(@Param('id') id: string) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    
    if (!admin) {
      return { success: false, message: '管理员不存在' };
    }

    await this.adminRepo.remove(admin);

    return {
      success: true,
      message: '管理员删除成功',
    };
  }

  @Get('posts')
  async getPosts(
    @Query('current') current: any = 1,
    @Query('pageSize') pageSize: any = 10,
    @Query('keyword') keyword: string = '',
    @Query('authorId') authorId: string = '',
  ) {
    const page = parseInt(current, 10) || 1;
    const limit = parseInt(pageSize, 10) || 10;
    const query = this.postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.shop', 'shop');
    
    if (keyword) {
      query.where('post.title LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('post.content LIKE :keyword', { keyword: `%${keyword}%` });
    }
    
    if (authorId) {
      query.andWhere('post.authorId = :authorId', { authorId });
    }

    const [posts, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('post.createdAt', 'DESC')
      .getManyAndCount();

    return {
      success: true,
      data: posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        images: post.images,
        coverImage: post.coverImage,
        authorId: post.authorId,
        author: post.author ? {
          id: post.author.id,
          nickname: post.author.nickname,
          avatar: post.author.avatar,
        } : null,
        shopId: post.shopId,
        shop: post.shop ? {
          id: post.shop.id,
          name: post.shop.name,
          logo: post.shop.logo,
        } : null,
        consumeRecord: post.consumeRecord,
        reviewCount: post.reviewCount,
        isRecommended: post.isRecommended,
        recommendRank: post.recommendRank,
        location: post.location,
        eventTime: post.eventTime,
        createdAt: post.createdAt,
      })),
      total,
    };
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string) {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author', 'shop'],
    });
    
    if (!post) {
      return { success: false, message: '帖子不存在' };
    }

    return {
      success: true,
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        images: post.images,
        coverImage: post.coverImage,
        authorId: post.authorId,
        author: post.author ? {
          id: post.author.id,
          nickname: post.author.nickname,
          avatar: post.author.avatar,
        } : null,
        shopId: post.shopId,
        shop: post.shop ? {
          id: post.shop.id,
          name: post.shop.name,
          logo: post.shop.logo,
        } : null,
        consumeRecord: post.consumeRecord,
        reviewCount: post.reviewCount,
        isRecommended: post.isRecommended,
        recommendRank: post.recommendRank,
        location: post.location,
        eventTime: post.eventTime,
        createdAt: post.createdAt,
      },
    };
  }

  @Put('posts/:id')
  async updatePost(@Param('id') id: string, @Body() body: any) {
    const post = await this.postRepo.findOne({ where: { id } });
    
    if (!post) {
      return { success: false, message: '帖子不存在' };
    }

    if (body.title !== undefined) post.title = body.title;
    if (body.content !== undefined) post.content = body.content;
    if (body.images !== undefined) post.images = body.images;
    if (body.coverImage !== undefined) post.coverImage = body.coverImage;
    if (body.shopId !== undefined) post.shopId = body.shopId;
    if (body.isRecommended !== undefined) post.isRecommended = body.isRecommended;
    if (body.recommendRank !== undefined) post.recommendRank = body.recommendRank;
    if (body.location !== undefined) post.location = body.location;
    if (body.eventTime !== undefined) post.eventTime = body.eventTime;

    await this.postRepo.save(post);

    return {
      success: true,
      message: '帖子更新成功',
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        isRecommended: post.isRecommended,
        recommendRank: post.recommendRank,
      },
    };
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') id: string) {
    const post = await this.postRepo.findOne({ where: { id } });
    
    if (!post) {
      return { success: false, message: '帖子不存在' };
    }

    await this.postRepo.remove(post);

    return {
      success: true,
      message: '帖子删除成功',
    };
  }

  @Get('shops')
  async getShops(
    @Query('current') current: any = 1,
    @Query('pageSize') pageSize: any = 10,
    @Query('keyword') keyword: string = '',
    @Query('category') category: string = '',
  ) {
    const page = parseInt(current, 10) || 1;
    const limit = parseInt(pageSize, 10) || 10;
    const query = this.shopRepo.createQueryBuilder('shop');
    
    if (keyword) {
      query.where('shop.name LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('shop.address LIKE :keyword', { keyword: `%${keyword}%` });
    }
    
    if (category) {
      query.andWhere('shop.category = :category', { category });
    }

    const [shops, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('shop.createdAt', 'DESC')
      .getManyAndCount();

    return {
      success: true,
      data: shops.map(shop => ({
        id: shop.id,
        name: shop.name,
        category: shop.category,
        address: shop.address,
        location: shop.location,
        coverImage: shop.coverImage,
        logo: shop.logo,
        phone: shop.phone,
        businessHours: shop.businessHours,
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        summaryTags: shop.summaryTags,
        isVerified: shop.isVerified,
        createdAt: shop.createdAt,
      })),
      total,
    };
  }

  @Get('shops/:id')
  async getShop(@Param('id') id: string) {
    const shop = await this.shopRepo.findOne({ where: { id } });
    
    if (!shop) {
      return { success: false, message: '商家不存在' };
    }

    return {
      success: true,
      data: {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        address: shop.address,
        location: shop.location,
        coverImage: shop.coverImage,
        logo: shop.logo,
        phone: shop.phone,
        businessHours: shop.businessHours,
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        summaryTags: shop.summaryTags,
        isVerified: shop.isVerified,
        createdAt: shop.createdAt,
      },
    };
  }

  @Post('shops')
  @HttpCode(HttpStatus.OK)
  async createShop(@Body() body: any) {
    const shop = this.shopRepo.create({
      name: body.name,
      category: body.category,
      address: body.address,
      location: body.location,
      coverImage: body.coverImage,
      logo: body.logo,
      phone: body.phone,
      businessHours: body.businessHours,
      rating: body.rating || 5.0,
      reviewCount: body.reviewCount || 0,
      summaryTags: body.summaryTags,
      isVerified: body.isVerified || false,
    });

    await this.shopRepo.save(shop);

    return {
      success: true,
      message: '商家创建成功',
      data: {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        address: shop.address,
        isVerified: shop.isVerified,
        createdAt: shop.createdAt,
      },
    };
  }

  @Put('shops/:id')
  async updateShop(@Param('id') id: string, @Body() body: any) {
    const shop = await this.shopRepo.findOne({ where: { id } });
    
    if (!shop) {
      return { success: false, message: '商家不存在' };
    }

    if (body.name !== undefined) shop.name = body.name;
    if (body.category !== undefined) shop.category = body.category;
    if (body.address !== undefined) shop.address = body.address;
    if (body.location !== undefined) shop.location = body.location;
    if (body.coverImage !== undefined) shop.coverImage = body.coverImage;
    if (body.logo !== undefined) shop.logo = body.logo;
    if (body.phone !== undefined) shop.phone = body.phone;
    if (body.businessHours !== undefined) shop.businessHours = body.businessHours;
    if (body.rating !== undefined) shop.rating = body.rating;
    if (body.reviewCount !== undefined) shop.reviewCount = body.reviewCount;
    if (body.summaryTags !== undefined) shop.summaryTags = body.summaryTags;
    if (body.isVerified !== undefined) shop.isVerified = body.isVerified;

    await this.shopRepo.save(shop);

    return {
      success: true,
      message: '商家更新成功',
      data: {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        isVerified: shop.isVerified,
      },
    };
  }

  @Delete('shops/:id')
  async deleteShop(@Param('id') id: string) {
    const shop = await this.shopRepo.findOne({ where: { id } });
    
    if (!shop) {
      return { success: false, message: '商家不存在' };
    }

    await this.shopRepo.remove(shop);

    return {
      success: true,
      message: '商家删除成功',
    };
  }
}