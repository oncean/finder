import { BeforeInsert, Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { generateSnowflakeId } from '../common/utils/snowflake.util';

@Entity('chat_groups')
export class ChatGroup {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @BeforeInsert()
  assignId() {
    this.id = this.id || generateSnowflakeId();
  }

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  district: string;

  @Column({ type: 'double precision', nullable: true, name: 'center_lat' })
  centerLat: number;

  @Column({ type: 'double precision', nullable: true, name: 'center_lng' })
  centerLng: number;

  @Column({ type: 'int', nullable: true, name: 'coverage_radius' })
  coverageRadius: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
