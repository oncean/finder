import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { ChatGroup } from '../../entities/chat-group.entity';
import { User } from '../../entities/user.entity';
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
  ) {}

  async getGroupInfo(groupId: string) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      return null;
    }
    return {
      id: group.id,
      name: group.name,
      city: group.city,
      district: group.district,
      onlineCount: group.onlineCount,
      memberCount: group.memberCount,
    };
  }

  async getMessages(groupId: string, lastId?: string, limit: number = 20) {
    const where: any = { groupId };
    
    if (lastId) {
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
    const message = this.messageRepo.create({
      groupId: dto.groupId,
      senderId,
      type: dto.type,
      content: dto.content,
      shopCard: dto.shopCard,
    });

    await this.messageRepo.save(message);

    // 获取发送者信息
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
}
