import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Comment } from './comment.entity';

@Entity('wind_vane')
export class WindVane {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id' })
  reviewId: string;

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'review_id' })
  review: Comment;

  @Column({ type: 'int' })
  ranking: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'featured_tag' })
  featuredTag: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
