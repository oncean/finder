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

  @Column({ type: 'bigint', name: 'author_id', nullable: true })
  authorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'varchar', length: 128, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({ type: 'json', nullable: true, name: 'consume_record' })
  consumeRecord: {
    amount: number;
    tradeTime: string;
    image?: string;
  };

  @Column({ type: 'int', default: 0, name: 'like_count' })
  likeCount: number;

  @Column({ type: 'boolean', default: false, name: 'is_fengxiangbiao' })
  isFengxiangbiao: boolean;

  @Column({ type: 'int', nullable: true, name: 'fengxiangbiao_rank' })
  fengxiangbiaoRank: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
