import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { Shop } from '../../entities/shop.entity';
import { AuthGuard } from '../../common/guards/auth.guard';
import * as bcrypt from 'bcrypt';
import { Message } from '../../entities/message.entity';
import { ChatGroup } from '../../entities/chat-group.entity';
import { ChatOnlineUser } from '../../entities/chat-online-user.entity';
import { assertCanDeleteEntity } from '../../common/utils/delete-dependency.util';
import * as fs from 'fs';
import * as path from 'path';
import { ChatRealtimeService } from '../../websocket/chat-realtime.service';
import { StorageService } from '../storage/storage.service';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(ChatGroup)
    private chatGroupRepo: Repository<ChatGroup>,
    @InjectRepository(ChatOnlineUser)
    private chatOnlineUserRepo: Repository<ChatOnlineUser>,
    private dataSource: DataSource,
    private chatRealtimeService: ChatRealtimeService,
    private storageService: StorageService,
  ) {}

  private async mapUserResponse(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      avatarUrl: await this.storageService.resolveUrl(user.avatar),
      phone: user.phone,
      location: user.location,
      openid: user.openid,
      unionid: user.unionid,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

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
      list: await Promise.all(users.map(user => this.mapUserResponse(user))),
      total,
    };
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }

    return this.mapUserResponse(user);
  }

  @Post('users')
  @HttpCode(HttpStatus.OK)
  async createUser(@Body() body: any) {
    const user = this.userRepo.create({
      nickname: body.nickname || '新用户',
      avatar: body.avatar,
      phone: body.phone,
      location: body.location,
    });

    await this.userRepo.save(user);

    return this.mapUserResponse(user);
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }

    if (body.nickname !== undefined) user.nickname = body.nickname;
    if (body.avatar !== undefined) user.avatar = body.avatar;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.location !== undefined) user.location = body.location;

    await this.userRepo.save(user);

    return this.mapUserResponse(user);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }

    // 级联删除聊天在线用户关联记录
    await this.chatOnlineUserRepo.delete({ userId: id });

    await assertCanDeleteEntity(this.dataSource, this.userRepo.metadata, id, '用户');
    await this.userRepo.remove(user);

    return { message: '用户删除成功' };
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
      list: await Promise.all(admins.map(async admin => ({
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: await this.storageService.resolveUrl(admin.avatar),
        phone: admin.phone,
        permissions: admin.permissions,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      }))),
      total,
    };
  }

  @Get('admins/:id')
  async getAdmin(@Param('id') id: string) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    
    if (!admin) {
      throw new HttpException('管理员不存在', HttpStatus.BAD_REQUEST);
    }

    return {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: await this.storageService.resolveUrl(admin.avatar),
        phone: admin.phone,
        permissions: admin.permissions,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
    };
  }

  @Post('admins')
  @HttpCode(HttpStatus.OK)
  async createAdmin(@Body() body: any) {
    const existing = await this.adminRepo.findOne({ where: { username: body.username } });
    
    if (existing) {
      throw new HttpException('用户名已存在', HttpStatus.BAD_REQUEST);
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
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        phone: admin.phone,
        permissions: admin.permissions,
        createdAt: admin.createdAt,
    };
  }

  @Put('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() body: any) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    
    if (!admin) {
      throw new HttpException('管理员不存在', HttpStatus.BAD_REQUEST);
    }

    if (body.username !== undefined) {
      const existing = await this.adminRepo.findOne({ where: { username: body.username } });
      if (existing && existing.id !== id) {
        throw new HttpException('用户名已存在', HttpStatus.BAD_REQUEST);
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
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        phone: admin.phone,
        permissions: admin.permissions,
        updatedAt: admin.updatedAt,
    };
  }

  @Delete('admins/:id')
  async deleteAdmin(@Param('id') id: string) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    
    if (!admin) {
      throw new HttpException('管理员不存在', HttpStatus.BAD_REQUEST);
    }

    await this.adminRepo.remove(admin);

    return { message: '管理员删除成功' };
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
      list: await Promise.all(shops.map(async shop => ({
        id: shop.id,
        name: shop.name,
        category: shop.category,
        address: shop.address,
        location: shop.location,
        city: shop.city,
        coverImage: await this.storageService.resolveUrl(shop.coverImage),
        logo: await this.storageService.resolveUrl(shop.logo),
        phone: shop.phone,
        businessHours: shop.businessHours,
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        summaryTags: shop.summaryTags,
        isVerified: shop.isVerified,
        createdAt: shop.createdAt,
      }))),
      total,
    };
  }

  @Get('shops/:id')
  async getShop(@Param('id') id: string) {
    const shop = await this.shopRepo.findOne({ where: { id } });
    
    if (!shop) {
      throw new HttpException('商家不存在', HttpStatus.BAD_REQUEST);
    }

    return {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        address: shop.address,
        location: shop.location,
        city: shop.city,
        coverImage: await this.storageService.resolveUrl(shop.coverImage),
        logo: await this.storageService.resolveUrl(shop.logo),
        phone: shop.phone,
        businessHours: shop.businessHours,
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        summaryTags: shop.summaryTags,
        isVerified: shop.isVerified,
        createdAt: shop.createdAt,
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
      city: body.city,
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
        id: shop.id,
        name: shop.name,
        category: shop.category,
        address: shop.address,
        isVerified: shop.isVerified,
        createdAt: shop.createdAt,
    };
  }

  @Put('shops/:id')
  async updateShop(@Param('id') id: string, @Body() body: any) {
    const shop = await this.shopRepo.findOne({ where: { id } });
    
    if (!shop) {
      throw new HttpException('商家不存在', HttpStatus.BAD_REQUEST);
    }

    if (body.name !== undefined) shop.name = body.name;
    if (body.category !== undefined) shop.category = body.category;
    if (body.address !== undefined) shop.address = body.address;
    if (body.location !== undefined) shop.location = body.location;
    if (body.city !== undefined) shop.city = body.city;
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
        id: shop.id,
        name: shop.name,
        category: shop.category,
        isVerified: shop.isVerified,
    };
  }

  @Delete('shops/:id')
  async deleteShop(@Param('id') id: string) {
    const shop = await this.shopRepo.findOne({ where: { id } });
    
    if (!shop) {
      throw new HttpException('商家不存在', HttpStatus.BAD_REQUEST);
    }

    await assertCanDeleteEntity(this.dataSource, this.shopRepo.metadata, id, '店铺');
    await this.shopRepo.remove(shop);

    return { message: '商家删除成功' };
  }

  // ---- 消息管理 ----

  @Get('messages')
  async getMessages(
    @Query('current') current: any = 1,
    @Query('pageSize') pageSize: any = 10,
    @Query('type') type: string = '',
    @Query('keyword') keyword: string = '',
  ) {
    const page = parseInt(current, 10) || 1;
    const limit = parseInt(pageSize, 10) || 10;
    const query = this.messageRepo.createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .leftJoinAndSelect('msg.group', 'group')
      .leftJoinAndSelect('msg.shop', 'shop');

    if (type) {
      query.andWhere('msg.type = :type', { type });
    }

    if (keyword) {
      query.andWhere('msg.content LIKE :keyword', { keyword: `%${keyword}%` });
    }

    const [messages, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('msg.createdAt', 'DESC')
      .getManyAndCount();

    return {
      list: await Promise.all(messages.map(async msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.type === 'image' ? await this.storageService.resolveUrl(msg.content) : msg.content,
        shopId: msg.shopId,
        shopCard: msg.type === 'shop_card' ? this.formatMessageShopCard(msg.shop) : null,
        groupId: msg.groupId,
        group: msg.group ? { id: msg.group.id, name: msg.group.name } : null,
        senderId: msg.senderId,
        sender: msg.sender ? {
          id: msg.sender.id,
          nickname: msg.sender.nickname,
          avatar: await this.storageService.resolveUrl(msg.sender.avatar),
        } : null,
        createdAt: msg.createdAt,
      }))),
      total,
    };
  }

  @Post('messages/send')
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() body: any) {
    const { type, content, shopCard, shopId, groupId, senderId } = body;

    if (!type) {
      throw new HttpException('消息类型不能为空', HttpStatus.BAD_REQUEST);
    }

    if (!['text', 'image', 'shop_card'].includes(type)) {
      throw new HttpException('消息类型无效，仅支持 text/image/shop_card', HttpStatus.BAD_REQUEST);
    }

    if (type === 'text' && !content) {
      throw new HttpException('文本消息内容不能为空', HttpStatus.BAD_REQUEST);
    }

    if (type === 'image' && !content) {
      throw new HttpException('图片URL不能为空', HttpStatus.BAD_REQUEST);
    }

    const finalShopId = type === 'shop_card' ? shopId || shopCard?.shopId || content : null;

    if (type === 'shop_card' && !finalShopId) {
      throw new HttpException('店铺ID不能为空', HttpStatus.BAD_REQUEST);
    }

    if (!groupId) {
      throw new HttpException('群组ID不能为空', HttpStatus.BAD_REQUEST);
    }

    const group = await this.chatGroupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new HttpException('群组不存在', HttpStatus.BAD_REQUEST);
    }

    if (!senderId) {
      throw new HttpException('发送用户不能为空', HttpStatus.BAD_REQUEST);
    }

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new HttpException('发送用户不存在', HttpStatus.BAD_REQUEST);
    }

    let shopEntity: Shop;
    if (type === 'shop_card') {
      shopEntity = await this.shopRepo.findOne({ where: { id: finalShopId } });
      if (!shopEntity) {
        throw new HttpException('店铺不存在', HttpStatus.BAD_REQUEST);
      }
    }

    const message = this.messageRepo.create({
      groupId,
      senderId: sender.id,
      type,
      content: type === 'text' ? content : (type === 'image' ? content : null),
      shopId: type === 'shop_card' ? finalShopId : null,
    });

    await this.messageRepo.save(message);

    const result = {
        id: message.id,
        groupId: message.groupId,
        type: message.type,
        content: type === 'image' ? await this.storageService.resolveUrl(message.content) : message.content,
        shopId: message.shopId,
        shopCard: type === 'shop_card' ? this.formatMessageShopCard(shopEntity) : null,
        sender: {
          id: sender.id,
          nickname: sender.nickname,
          avatar: await this.storageService.resolveUrl(sender.avatar),
        },
        createdAt: message.createdAt,
    };

    this.chatRealtimeService.broadcastToGroup(groupId, 'message', result);

    return result;
  }

  private async formatMessageShopCard(shop: Shop) {
    if (!shop) {
      return null;
    }

    return {
      shopId: shop.id,
      name: shop.name,
      address: shop.address,
      location: shop.location,
      coverImage: await this.storageService.resolveUrl(shop.coverImage),
      distance: 0,
      summaryTags: shop.summaryTags,
      reviewCount: shop.reviewCount,
      rating: shop.rating,
    };
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    const message = await this.messageRepo.findOne({ where: { id } });
    
    if (!message) {
      throw new HttpException('消息不存在', HttpStatus.BAD_REQUEST);
    }

    await this.messageRepo.remove(message);

    return { message: '消息删除成功' };
  }

  // ---- 群组管理 ----

  @Get('chat-groups')
  async getChatGroups(
    @Query('current') current: any = 1,
    @Query('pageSize') pageSize: any = 10,
    @Query('keyword') keyword: string = '',
  ) {
    const page = parseInt(current, 10) || 1;
    const limit = parseInt(pageSize, 10) || 10;
    const query = this.chatGroupRepo.createQueryBuilder('group');
    
    if (keyword) {
      query.where('group.name LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('group.city LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('group.district LIKE :keyword', { keyword: `%${keyword}%` });
    }

    const [groups, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('group.createdAt', 'DESC')
      .getManyAndCount();

    return {
      list: await Promise.all(groups.map(async (group) => ({
        id: group.id,
        name: group.name,
        city: group.city,
        district: group.district,
        centerLat: group.centerLat,
        centerLng: group.centerLng,
        coverageRadius: group.coverageRadius,
        onlineCount: await this.countChatGroupOnlineUsers(group.id),
        createdAt: group.createdAt,
      }))),
      total,
    };
  }

  private async countChatGroupOnlineUsers(groupId: string) {
    return this.chatOnlineUserRepo.count({
      where: { groupId, isOnline: true },
    });
  }

  private parseOptionalNumber(value: any) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  @Get('chat-groups/:id/online-users')
  async getChatGroupOnlineUsers(@Param('id') id: string) {
    const group = await this.chatGroupRepo.findOne({ where: { id } });

    if (!group) {
      throw new HttpException('群组不存在', HttpStatus.BAD_REQUEST);
    }

    const onlineUsers = await this.chatOnlineUserRepo.find({
      where: { groupId: id, isOnline: true },
      relations: ['user'],
      order: { updatedAt: 'DESC' },
    });

    return {
      list: await Promise.all(onlineUsers.map(async (item) => ({
        id: item.id,
        groupId: item.groupId,
        userId: item.userId,
        isOnline: item.isOnline,
        lastActiveAt: item.lastActiveAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        user: item.user ? {
          id: item.user.id,
          nickname: item.user.nickname,
          avatar: await this.storageService.resolveUrl(item.user.avatar),
          phone: item.user.phone,
        } : null,
      }))),
      total: onlineUsers.length,
    };
  }

  @Post('chat-groups/:id/online-users')
  @HttpCode(HttpStatus.OK)
  async addChatGroupOnlineUser(@Param('id') id: string, @Body() body: any) {
    if (!body.userId) {
      throw new HttpException('请选择在线用户', HttpStatus.BAD_REQUEST);
    }

    const group = await this.chatGroupRepo.findOne({ where: { id } });
    if (!group) {
      throw new HttpException('群组不存在', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepo.findOne({ where: { id: body.userId } });
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }

    let onlineUser = await this.chatOnlineUserRepo.findOne({
      where: { groupId: id, userId: body.userId },
    });

    if (onlineUser) {
      onlineUser.isOnline = true;
      onlineUser.lastActiveAt = new Date();
    } else {
      onlineUser = this.chatOnlineUserRepo.create({
        groupId: id,
        userId: body.userId,
        isOnline: true,
        lastActiveAt: new Date(),
      });
    }

    await this.chatOnlineUserRepo.save(onlineUser);

    return {
        id: onlineUser.id,
        groupId: onlineUser.groupId,
        userId: onlineUser.userId,
        isOnline: onlineUser.isOnline,
        group: {
          id,
          onlineCount: await this.countChatGroupOnlineUsers(id),
        },
    };
  }

  @Delete('chat-groups/:id/online-users/:userId')
  async deleteChatGroupOnlineUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const group = await this.chatGroupRepo.findOne({ where: { id } });
    if (!group) {
      throw new HttpException('群组不存在', HttpStatus.BAD_REQUEST);
    }

    await this.chatOnlineUserRepo.delete({ groupId: id, userId });

    return {
        groupId: id,
        onlineCount: await this.countChatGroupOnlineUsers(id),
    };
  }

  @Get('chat-groups/:id')
  async getChatGroup(@Param('id') id: string) {
    const group = await this.chatGroupRepo.findOne({ where: { id } });
    
    if (!group) {
      throw new HttpException('群组不存在', HttpStatus.BAD_REQUEST);
    }

    return {
        id: group.id,
        name: group.name,
        city: group.city,
        district: group.district,
        centerLat: group.centerLat,
        centerLng: group.centerLng,
        coverageRadius: group.coverageRadius,
        onlineCount: await this.countChatGroupOnlineUsers(group.id),
        createdAt: group.createdAt,
    };
  }

  @Post('chat-groups')
  @HttpCode(HttpStatus.OK)
  async createChatGroup(@Body() body: any) {
    if (!body.name) {
      throw new HttpException('群组名称不能为空', HttpStatus.BAD_REQUEST);
    }

    const group = this.chatGroupRepo.create({
      name: body.name,
      city: body.city || '',
      district: body.district || '',
      centerLat: this.parseOptionalNumber(body.centerLat),
      centerLng: this.parseOptionalNumber(body.centerLng),
      coverageRadius: this.parseOptionalNumber(body.coverageRadius),
    });

    await this.chatGroupRepo.save(group);

    return {
        id: group.id,
        name: group.name,
        city: group.city,
        district: group.district,
        centerLat: group.centerLat,
        centerLng: group.centerLng,
        coverageRadius: group.coverageRadius,
        onlineCount: 0,
        createdAt: group.createdAt,
    };
  }

  @Put('chat-groups/:id')
  async updateChatGroup(@Param('id') id: string, @Body() body: any) {
    const group = await this.chatGroupRepo.findOne({ where: { id } });
    
    if (!group) {
      throw new HttpException('群组不存在', HttpStatus.BAD_REQUEST);
    }

    if (body.name !== undefined) group.name = body.name;
    if (body.city !== undefined) group.city = body.city;
    if (body.district !== undefined) group.district = body.district;
    if (body.centerLat !== undefined) group.centerLat = this.parseOptionalNumber(body.centerLat);
    if (body.centerLng !== undefined) group.centerLng = this.parseOptionalNumber(body.centerLng);
    if (body.coverageRadius !== undefined) group.coverageRadius = this.parseOptionalNumber(body.coverageRadius);

    await this.chatGroupRepo.save(group);

    return {
        id: group.id,
        name: group.name,
        city: group.city,
        district: group.district,
        centerLat: group.centerLat,
        centerLng: group.centerLng,
        coverageRadius: group.coverageRadius,
        onlineCount: await this.countChatGroupOnlineUsers(group.id),
        createdAt: group.createdAt,
    };
  }

  @Delete('chat-groups/:id')
  async deleteChatGroup(@Param('id') id: string) {
    const group = await this.chatGroupRepo.findOne({ where: { id } });
    
    if (!group) {
      throw new HttpException('群组不存在', HttpStatus.BAD_REQUEST);
    }

    await assertCanDeleteEntity(this.dataSource, this.chatGroupRepo.metadata, id, '群组');
    await this.chatGroupRepo.remove(group);

    return { message: '群组删除成功' };
  }

  @Get('random-avatar')
  async getRandomAvatar() {
    const avatarDir = process.env.AVATAR_DIR || path.join(process.cwd(), 'assets', 'avatar');
    
    try {
      const files = fs.readdirSync(avatarDir).filter(f => 
        /\.(png|jpg|jpeg|gif|webp)$/i.test(f)
      );
      
      if (files.length === 0) {
        throw new HttpException('头像目录为空', HttpStatus.BAD_REQUEST);
      }
      
      const randomFile = files[Math.floor(Math.random() * files.length)];
      const filePath = path.join(avatarDir, randomFile);
      const result = await this.storageService.uploadFile(
        fs.readFileSync(filePath),
        `avatar-${Date.now()}-${randomFile}`,
        'uploads/avatar',
      );
      const url = await this.storageService.resolveUrl(result.fileId);
      
      return { fileId: result.fileId, url, filename: randomFile };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('获取随机头像失败: ' + error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
