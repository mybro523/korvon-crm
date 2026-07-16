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
import { Product } from './product.entity';
import { SalesPoint } from './sales-point.entity';
import { User } from './user.entity';

export type SaleType = 'WHOLESALE' | 'RETAIL';
export type PaymentMethod = 'CASH' | 'CARD';
export type SaleSource = 'WAREHOUSE' | 'POINT';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  /** снапшоты — история продаж живёт даже после удаления товара/точки/продавца */
  @Column()
  productName: string;

  @Column()
  unit: string;

  @Column({ type: 'varchar' })
  source: SaleSource;

  @Column({ type: 'uuid', nullable: true })
  pointId: string | null;

  @ManyToOne(() => SalesPoint, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pointId' })
  point: SalesPoint | null;

  @Column({ type: 'varchar', nullable: true })
  pointName: string | null;

  @Column({ type: 'uuid', nullable: true })
  sellerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sellerId' })
  seller: User | null;

  @Column()
  sellerName: string;

  @Column({ type: 'varchar' })
  saleType: SaleType;

  @Column({ type: 'varchar' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: decimalTransformer })
  quantity: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  totalAmount: number;

  /** себестоимость единицы на момент продажи */
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  costAtSale: number;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
