import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ChatGroup } from './chat-group.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => ChatGroup)
  @JoinColumn({ name: 'group_id' })
  group: ChatGroup;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'jsonb', nullable: true, name: 'shop_card' })
  shopCard: {
    shopId: string;
    name: string;
    address: string;
    distance: number;
    summaryTags: any;
    reviewCount: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
