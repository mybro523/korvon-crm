import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/numbers';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ default: 'дона' })
  unit: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  costPrice: number;

  /** остаток на складе */
  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: decimalTransformer })
  quantity: number;

  @Column({ type: 'date' })
  arrivalDate: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
