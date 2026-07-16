import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsUUID, Max, Min, ValidateIf } from 'class-validator';
import { PaymentMethod, SaleSource, SaleType } from '../../entities';

/** лимиты колонок numeric(14,2) и numeric(14,3) */
export const MAX_MONEY = 999_999_999_999.99;
export const MAX_QTY = 99_999_999_999.999;
export const MSG_TOO_BIG = 'Қимат аз ҳадди иҷозатшуда зиёд аст';

export class CreateSaleDto {
  @IsIn(['WAREHOUSE', 'POINT'], { message: 'Ҷои фурӯш нодуруст аст' })
  source: SaleSource;

  @ValidateIf((o) => o.source === 'POINT')
  @IsUUID('4', { message: 'Нуқтаи фурӯш нодуруст аст' })
  pointId?: string;

  @IsUUID('4', { message: 'Молро интихоб кунед' })
  productId: string;

  @IsIn(['WHOLESALE', 'RETAIL'], { message: 'Намуди фурӯш нодуруст аст' })
  saleType: SaleType;

  @IsIn(['CASH', 'CARD'], { message: 'Тарзи пардохт нодуруст аст' })
  paymentMethod: PaymentMethod;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Миқдор нодуруст аст' })
  @Min(0.001, { message: 'Миқдор бояд аз сифр зиёд бошад' })
  @Max(MAX_QTY, { message: MSG_TOO_BIG })
  quantity: number;

  /** только для оптовой продажи: общая сумма */
  @ValidateIf((o) => o.saleType === 'WHOLESALE')
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Маблағи умумӣ нодуруст аст' })
  @Min(0.01, { message: 'Маблағи умумӣ бояд аз сифр зиёд бошад' })
  @Max(MAX_MONEY, { message: MSG_TOO_BIG })
  totalAmount?: number;

  /** только для розничной продажи: цена за единицу */
  @ValidateIf((o) => o.saleType === 'RETAIL')
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Нархи воҳид нодуруст аст' })
  @Min(0.01, { message: 'Нархи воҳид бояд аз сифр зиёд бошад' })
  @Max(MAX_MONEY, { message: MSG_TOO_BIG })
  unitPrice?: number;
}
