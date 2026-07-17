export { User, UserRole } from './user.entity';
export { SalesPoint } from './sales-point.entity';
export { Product } from './product.entity';
export { PointStock } from './point-stock.entity';
export { Transfer, TransferDirection } from './transfer.entity';
export { Sale, SaleType, PaymentMethod, SaleSource } from './sale.entity';
export { Notification } from './notification.entity';
export { Setting } from './setting.entity';
export { TelegramLinkCode } from './telegram-link-code.entity';

import { User } from './user.entity';
import { SalesPoint } from './sales-point.entity';
import { Product } from './product.entity';
import { PointStock } from './point-stock.entity';
import { Transfer } from './transfer.entity';
import { Sale } from './sale.entity';
import { Notification } from './notification.entity';
import { Setting } from './setting.entity';
import { TelegramLinkCode } from './telegram-link-code.entity';

export const ALL_ENTITIES = [
  User,
  SalesPoint,
  Product,
  PointStock,
  Transfer,
  Sale,
  Notification,
  Setting,
  TelegramLinkCode,
];
