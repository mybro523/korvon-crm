import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { decimalTransformer } from '../common/numbers';
import { Product } from './product.entity';
import { SalesPoint } from './sales-point.entity';

/** остаток товара в конкретной точке продаж */
@Entity('point_stocks')
@Unique(['pointId', 'productId'])
export class PointStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  pointId: string;

  @ManyToOne(() => SalesPoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pointId' })
  point: SalesPoint;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: decimalTransformer })
  quantity: number;
}
