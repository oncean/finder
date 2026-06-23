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
  private readonly mockOnlineUserCount = 20;

  private readonly staticBaseUrl =
    process.env.STATIC_BASE_URL || 'http://192.168.2.103/static';

  private get defaultAvatarImage() {
    return `${this.staticBaseUrl}/default-avatar.png`;
  }

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
    let group = await this.getOrCreateGroup(groupId);
    
    await this.seedMockOnlineUsers(group.id);
    const onlineUsers = await this.getOnlineUsers(group.id);
    if (group.onlineCount !== onlineUsers.length || group.memberCount < onlineUsers.length) {
      group.onlineCount = onlineUsers.length;
      group.memberCount = Math.max(group.memberCount, onlineUsers.length);
      group = await this.groupRepo.save(group);
    }

    return {
      id: group.id,
      name: group.name,
      city: group.city,
      district: group.district,
      onlineCount: onlineUsers.length,
      onlineUsers: onlineUsers.slice(0, 3),
      memberCount: Math.max(group.memberCount, onlineUsers.length),
    };
  }

  async getOnlineUsersByGroupId(groupId: string) {
    const group = await this.getOrCreateGroup(groupId);
    await this.seedMockOnlineUsers(group.id);
    const onlineUsers = await this.getOnlineUsers(group.id);

    return {
      groupId: group.id,
      totalCount: onlineUsers.length,
      list: onlineUsers.slice(0, 3),
    };
  }

  async seedMockOnlineUsers(groupId: string) {
    await this.migrateLegacyAvatars();

    for (let i = 1; i <= this.mockOnlineUserCount; i++) {
      const index = String(i).padStart(2, '0');
      // 优先使用 mock_user_XX（真实用户），否则使用 mock_online_user_XX
      let user = await this.userRepo.findOne({ 
        where: { openid: `mock_user_${index}` } 
      });
      
      if (!user) {
        user = await this.userRepo.findOne({ 
          where: { openid: `mock_online_user_${index}` } 
        });
      }

      if (!user) {
        user = this.userRepo.create({
          openid: `mock_user_${index}`,
          nickname: `用户${index}`,
          avatar: this.defaultAvatarImage,
          location: {
            lat: 32.0603,
            lng: 118.7969,
            city: '南京市',
          },
        });
        user = await this.userRepo.save(user);
      } else if (user.avatar === '/static/images/default-avatar.png') {
        user.avatar = this.defaultAvatarImage;
        user = await this.userRepo.save(user);
      }

      let onlineUser = await this.onlineUserRepo.findOne({
        where: { groupId, userId: user.id },
      });

      if (!onlineUser) {
        onlineUser = this.onlineUserRepo.create({
          groupId,
          userId: user.id,
          isOnline: true,
          lastActiveAt: new Date(),
        });
      } else {
        onlineUser.isOnline = true;
        onlineUser.lastActiveAt = new Date();
      }

      await this.onlineUserRepo.save(onlineUser);
    }
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
    await this.seedMockOnlineUsers(targetGroup.id);
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

    const shopCardMessages = messages.filter(
      (msg) => msg.type === 'shop_card' && (!msg.shopCard || !msg.shopCard.name)
    );

    if (shopCardMessages.length > 0) {
      const shopIds = shopCardMessages.map((msg) => msg.content).filter((id) => id && id.trim());
      if (shopIds.length > 0) {
        const shops = await this.shopRepo.findByIds(shopIds);
        const shopMap = new Map(shops.map((shop) => [shop.id, shop]));

        shopCardMessages.forEach((msg) => {
          const shop = shopMap.get(msg.content);
          if (shop) {
            msg.shopCard = {
              shopId: shop.id,
              name: shop.name || '南京这家店味道真不错',
              address: shop.address || '湛山路与望江西路',
              coverImage: shop.coverImage || `${this.staticBaseUrl}/default-shop.png`,
              distance: 0,
              summaryTags: shop.summaryTags || {
                positive: ['重油重辣'],
                negative: ['太酸了'],
                averageCost: 22,
              },
              reviewCount: Math.max(shop.reviewCount || 0, 6321),
              rating: shop.rating || 5.0,
            };
          }
        });
      }
    }

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
      shopCard: msg.shopCard,
      createdAt: msg.createdAt,
    }));
  }

  async sendMessage(dto: SendMessageDto, senderId: string) {
    let shopCard = dto.shopCard;

    if (dto.type === 'shop_card' && !shopCard && dto.content) {
      const shop = await this.shopRepo.findOne({
        where: { id: dto.content },
      });

      if (shop) {
        shopCard = {
          shopId: shop.id,
          name: shop.name || '南京这家店味道真不错',
          address: shop.address || '湛山路与望江西路',
          coverImage: shop.coverImage || `${this.staticBaseUrl}/default-shop.png`,
          distance: 0,
          summaryTags: shop.summaryTags || {
            positive: ['重油重辣'],
            negative: ['太酸了'],
            averageCost: 22,
          },
          reviewCount: Math.max(shop.reviewCount || 0, 6321),
          rating: shop.rating || 5.0,
        };
      }
    }

    const message = this.messageRepo.create({
      groupId: dto.groupId,
      senderId,
      type: dto.type,
      content: dto.type === 'shop_card' ? '' : dto.content,
      shopCard,
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
      shopCard: message.shopCard,
      createdAt: message.createdAt,
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

  private async migrateLegacyAvatars() {
    await this.userRepo.update(
      { avatar: '/static/images/default-avatar.png' },
      { avatar: this.defaultAvatarImage },
    );
  }
}
