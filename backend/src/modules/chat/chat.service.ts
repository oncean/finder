import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { ChatGroup } from '../../entities/chat-group.entity';
import { User } from '../../entities/user.entity';
import { ChatOnlineUser } from '../../entities/chat-online-user.entity';
import { Shop } from '../../entities/shop.entity';
import { Comment } from '../../entities/comment.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(ChatGroup)
    private groupRepo: Repository<ChatGroup>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(ChatOnlineUser)
    private onlineUserRepo: Repository<ChatOnlineUser>,
    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>,
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
  ) {}

  private async getOrCreateGroup(groupId: string, lat?: number, lng?: number) {
    let group = groupId === 'default'
      ? await this.findDefaultGroupByLocation(lat, lng)
      : await this.groupRepo.findOne({ where: { id: groupId } });

    if (!group && groupId === 'default') {
      return null;
    }

    if (!group) {
      throw new HttpException('群组不存在', HttpStatus.NOT_FOUND);
    }

    return group;
  }

  private async findDefaultGroupByLocation(lat?: number, lng?: number) {
    if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }

    const groups = await this.groupRepo.find({
      where: {
        centerLat: Not(IsNull()),
        centerLng: Not(IsNull()),
        coverageRadius: Not(IsNull()),
      },
    });

    const matchedGroups = groups
      .map((group) => ({
        group,
        distance: this.calculateDistance(lat, lng, group.centerLat, group.centerLng),
      }))
      .filter(({ group, distance }) => distance <= group.coverageRadius)
      .sort((a, b) => a.distance - b.distance);

    return matchedGroups[0]?.group || null;
  }

  async getGroupInfo(groupId: string, lat?: number, lng?: number) {
    const group = await this.getOrCreateGroup(groupId, lat, lng);

    if (!group) {
      return null;
    }
    
    const onlineUsers = await this.getOnlineUsers(group.id);

    return {
      id: group.id,
      name: group.name,
      city: group.city,
      district: group.district,
      centerLat: group.centerLat,
      centerLng: group.centerLng,
      coverageRadius: group.coverageRadius,
      onlineCount: onlineUsers.length,
      onlineUsers: onlineUsers.slice(0, 3),
    };
  }

  async getOnlineUsersByGroupId(groupId: string) {
    const group = await this.getOrCreateGroup(groupId);

    if (!group) {
      return {
        groupId: '',
        totalCount: 0,
        list: [],
      };
    }

    const onlineUsers = await this.getOnlineUsers(group.id);

    return {
      groupId: group.id,
      totalCount: onlineUsers.length,
      list: onlineUsers.slice(0, 3),
    };
  }

  async getOnlineUsers(groupId: string) {
    const onlineUsers = await this.onlineUserRepo.find({
      where: { groupId, isOnline: true },
      relations: ['user'],
      order: { updatedAt: 'DESC' },
    });

    return onlineUsers.map((onlineUser) => ({
      id: onlineUser.user.id,
      nickname: onlineUser.user.nickname,
      avatar: onlineUser.user.avatar,
    }));
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  async getOnlineUsersForBroadcast(groupId: string) {
    return this.getOnlineUsers(groupId);
  }

  async getGroupById(groupId: string) {
    return this.groupRepo.findOne({ where: { id: groupId } });
  }

  async markUserOnline(groupId: string, userId: string) {
    let onlineUser = await this.onlineUserRepo.findOne({
      where: { groupId, userId },
    });

    if (onlineUser) {
      onlineUser.isOnline = true;
      onlineUser.lastActiveAt = new Date();
    } else {
      onlineUser = this.onlineUserRepo.create({
        groupId,
        userId,
        isOnline: true,
        lastActiveAt: new Date(),
      });
    }

    return this.onlineUserRepo.save(onlineUser);
  }

  async touchOnlineUser(groupId: string, userId: string) {
    await this.onlineUserRepo.update(
      { groupId, userId },
      { isOnline: true, lastActiveAt: new Date() },
    );
  }

  async markUserOffline(groupId: string, userId: string) {
    await this.onlineUserRepo.update(
      { groupId, userId },
      { isOnline: false, lastActiveAt: new Date() },
    );
  }

  async getMessages(groupId: string, lastId?: string, limit: number = 20) {
    const where: any = { groupId };

    if (lastId && lastId !== 'null' && lastId !== null) {
      const lastMessage = await this.messageRepo.findOne({
        where: { id: lastId },
      });
      if (lastMessage) {
        where.createdAt = LessThan(lastMessage.createdAt);
      }
    }

    const messages = await this.messageRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['sender'],
    });

    const shopIds = messages
      .filter((msg) => msg.type === 'shop_card' && msg.shopId)
      .map((msg) => msg.shopId);
    const shops = shopIds.length > 0 ? await this.shopRepo.findByIds(shopIds) : [];
    const shopMap = new Map(shops.map((shop) => [shop.id, shop]));

    const reversedMessages = messages.reverse();

    return await Promise.all(reversedMessages.map(async (msg) => ({
      id: msg.id,
      groupId: msg.groupId,
      sender: {
        id: msg.sender.id,
        nickname: msg.sender.nickname,
        avatar: msg.sender.avatar,
      },
      type: msg.type,
      content: msg.content,
      shopId: msg.shopId,
      shopCard: msg.type === 'shop_card' ? await this.formatShopCard(shopMap.get(msg.shopId)) : null,
      createdAt: msg.createdAt,
    })));
  }

  async sendMessage(dto: SendMessageDto, senderId: string) {
    const shopId = dto.type === 'shop_card'
      ? dto.shopId || dto.shopCard?.shopId || dto.content
      : null;

    const shop = shopId
      ? await this.shopRepo.findOne({ where: { id: shopId } })
      : null;

    const message = this.messageRepo.create({
      groupId: dto.groupId,
      senderId,
      type: dto.type,
      content: dto.type === 'shop_card' ? '' : dto.content,
      shopId,
    });

    await this.messageRepo.save(message);

    const sender = await this.userRepo.findOne({
      where: { id: senderId },
    });

    return {
      id: message.id,
      groupId: message.groupId,
      sender: {
        id: sender.id,
        nickname: sender.nickname,
        avatar: sender.avatar,
      },
      type: message.type,
      content: message.content,
      shopId: message.shopId,
      shopCard: message.type === 'shop_card' ? await this.formatShopCard(shop) : null,
      createdAt: message.createdAt,
    };
  }

  private formatShopCard(shop: Shop) {
    if (!shop) {
      return null;
    }

    const recentComments = this.commentRepo.find({
      where: { shopId: shop.id },
      order: { createdAt: 'DESC' },
      take: 4,
      relations: ['author'],
    });

    return recentComments.then((comments) => ({
      shopId: shop.id,
      name: shop.name,
      address: shop.address,
      location: shop.location,
      coverImage: shop.coverImage || shop.logo || '',
      summaryTags: shop.summaryTags,
      reviewCount: shop.reviewCount || 0,
      commentAvatars: comments.map(c => c.author?.avatar).filter(Boolean),
    }));
  }
}
