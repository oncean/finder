import { BeforeInsert, Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { generateSnowflakeId } from '../common/utils/snowflake.util';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @BeforeInsert()
  assignId() {
    this.id = this.id || generateSnowflakeId();
  }

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  openid: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  unionid: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nickname: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'json', nullable: true })
  location: { lat: number; lng: number; city: string };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
