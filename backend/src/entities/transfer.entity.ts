import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/numbers';
import { Product } from './product.entity';
import { SalesPoint } from './sales-point.entity';

export type TransferDirection = 'TO_POINT' | 'TO_WAREHOUSE';

/** история перемещений товара: склад ↔ точка продаж */
@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column()
  productName: string;

  @Column()
  unit: string;

  @Column({ type: 'uuid' })
  pointId: string;

  @ManyToOne(() => SalesPoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pointId' })
  point: SalesPoint;

  @Column({ type: 'varchar' })
  direction: TransferDirection;

  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: decimalTransformer })
  quantity: number;

  @Column({ default: '' })
  userName: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
