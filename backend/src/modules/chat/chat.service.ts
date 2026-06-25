import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { ChatGroup } from '../../entities/chat-group.entity';
import { User } from '../../entities/user.entity';
import { ChatOnlineUser } from '../../entities/chat-online-user.entity';
import { Shop } from '../../entities/shop.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  private readonly staticBaseUrl =
    process.env.STATIC_BASE_URL || 'http://192.168.2.103/static';

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
  ) {}

  private async getOrCreateGroup(groupId: string) {
    let group = groupId === 'default'
      ? await this.groupRepo.findOne({ where: { name: '吃喝玩乐群' } })
      : await this.groupRepo.findOne({ where: { id: groupId } });
    
    if (!group) {
      group = await this.createGroup('吃喝玩乐群', '南京市', '玄武区');
    }

    return group;
  }

  async getGroupInfo(groupId: string) {
    const group = await this.getOrCreateGroup(groupId);
    
    const onlineUsers = await this.getOnlineUsers(group.id);

    return {
      id: group.id,
      name: group.name,
      city: group.city,
      district: group.district,
      onlineCount: onlineUsers.length,
      onlineUsers: onlineUsers.slice(0, 3),
    };
  }

  async getOnlineUsersByGroupId(groupId: string) {
    const group = await this.getOrCreateGroup(groupId);
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

  async getMockOnlineUsers(groupId?: string) {
    const group = groupId
      ? await this.groupRepo.findOne({ where: { id: groupId } })
      : await this.groupRepo.findOne({ where: { name: '吃喝玩乐群' } });

    const targetGroup = group || await this.createGroup('吃喝玩乐群', '南京市', '玄武区');
    return this.getOnlineUsers(targetGroup.id);
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

    return messages.reverse().map(msg => ({
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
      shopCard: msg.type === 'shop_card' ? this.formatShopCard(shopMap.get(msg.shopId)) : null,
      createdAt: msg.createdAt,
    }));
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
      shopCard: message.type === 'shop_card' ? this.formatShopCard(shop) : null,
      createdAt: message.createdAt,
    };
  }

  private formatShopCard(shop: any) {
    if (!shop) {
      return null;
    }

    return {
      shopId: shop.id,
      name: shop.name || '南京这家店味道真不错',
      address: shop.address || '湛山路与望江西路',
      coverImage: shop.coverImage || `${this.staticBaseUrl}/default-shop.png`,
      distance: 0,
      summaryTags: shop.summaryTags || {
        positive: ['重油重辣'],
        negative: ['太酸了'],
      },
      reviewCount: Math.max(shop.reviewCount || 0, 6321),
      rating: shop.rating || 5.0,
    };
  }

  async createGroup(name: string, city: string, district: string) {
    const group = this.groupRepo.create({
      name,
      city,
      district,
    });
    return this.groupRepo.save(group);
  }
}
