export { User, UserRole } from './user.entity';
export { Product } from './product.entity';
export { Sale, SaleType, PaymentMethod } from './sale.entity';
export { Notification } from './notification.entity';
export { Setting } from './setting.entity';
export { TelegramLinkCode } from './telegram-link-code.entity';

import { User } from './user.entity';
import { Product } from './product.entity';
import { Sale } from './sale.entity';
import { Notification } from './notification.entity';
import { Setting } from './setting.entity';
import { TelegramLinkCode } from './telegram-link-code.entity';

export const ALL_ENTITIES = [User, Product, Sale, Notification, Setting, TelegramLinkCode];
