import { BeforeInsert, Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Shop } from './shop.entity';
import { generateSnowflakeId } from '../common/utils/snowflake.util';

@Entity('comments')
export class Comment {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @BeforeInsert()
  assignId() {
    this.id = this.id || generateSnowflakeId();
  }

  @Column({ type: 'bigint', name: 'shop_id' })
  shopId: string;

  @ManyToOne(() => Shop)
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @Column({ type: 'bigint', name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'varchar', length: 128, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({ type: 'jsonb', nullable: true, name: 'consume_record' })
  consumeRecord: {
    amount: number;
    tradeTime: string;
  };

  @Column({ type: 'int', default: 0, name: 'like_count' })
  likeCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
