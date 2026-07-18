import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'OWNER' | 'SELLER';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', default: 'SELLER' })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  /** chat_id подключённого Telegram (через кнопку «Подключить бот») */
  @Column({ type: 'varchar', nullable: true })
  telegramChatId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
