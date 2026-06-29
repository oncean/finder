import { BeforeInsert, Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { generateSnowflakeId } from '../common/utils/snowflake.util';

@Entity('shops')
export class Shop {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @BeforeInsert()
  assignId() {
    this.id = this.id || generateSnowflakeId();
  }

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'json', nullable: true })
  location: {
    lat: number;
    lng: number;
  };

  @Column({ type: 'varchar', length: 32, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'cover_image' })
  coverImage: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'business_hours' })
  businessHours: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 5.0 })
  rating: number;

  @Column({ type: 'int', default: 0, name: 'review_count' })
  reviewCount: number;

  @Column({ type: 'json', nullable: true, name: 'summary_tags' })
  summaryTags: {
    positive: string[];
    negative: string[];
  };

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
