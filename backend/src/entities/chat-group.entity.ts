import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('chat_groups')
export class ChatGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  district: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
