import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Shop } from './shop.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'shop_id', nullable: true })
  shopId: string;

  @ManyToOne(() => Shop)
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'cover_image' })
  coverImage: string;

  @Column({ type: 'jsonb', nullable: true, name: 'consume_record' })
  consumeRecord: {
    amount: number;
    merchantName: string;
    tradeTime: string;
    tradeNo: string;
    paymentMethod: string;
  };

  @Column({ type: 'int', default: 0, name: 'review_count' })
  reviewCount: number;

  @Column({ type: 'boolean', default: false, name: 'is_recommended' })
  isRecommended: boolean;

  @Column({ type: 'int', nullable: true, name: 'recommend_rank' })
  recommendRank: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  location: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'event_time' })
  eventTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
