import { BeforeInsert, Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ChatGroup } from './chat-group.entity';
import { Shop } from './shop.entity';
import { generateSnowflakeId } from '../common/utils/snowflake.util';

@Entity('messages')
export class Message {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @BeforeInsert()
  assignId() {
    this.id = this.id || generateSnowflakeId();
  }

  @Column({ type: 'bigint', name: 'group_id' })
  groupId: string;

  @ManyToOne(() => ChatGroup)
  @JoinColumn({ name: 'group_id' })
  group: ChatGroup;

  @Column({ type: 'bigint', name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'bigint', name: 'shop_id', nullable: true })
  shopId: string;

  @ManyToOne(() => Shop, { nullable: true })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
