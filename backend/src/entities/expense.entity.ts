import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/numbers';
import { User } from './user.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 500 })
  comment: string;

  /** кто добавил (снапшот имени — запись живёт даже после удаления сотрудника) */
  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @Column()
  createdByName: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
