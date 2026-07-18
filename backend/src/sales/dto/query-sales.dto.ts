import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaymentMethod, SaleType } from '../../entities';

export class QuerySalesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Саҳифа нодуруст аст' })
  @Min(1, { message: 'Саҳифа нодуруст аст' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит нодуруст аст' })
  @Min(1, { message: 'Лимит нодуруст аст' })
  @Max(100, { message: 'Лимит аз 100 зиёд буда наметавонад' })
  limit?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Санаи аввал нодуруст аст' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Санаи охир нодуруст аст' })
  to?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Фурӯшанда нодуруст аст' })
  sellerId?: string;

  @IsOptional()
  @IsIn(['CASH', 'CARD'], { message: 'Тарзи пардохт нодуруст аст' })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsIn(['WHOLESALE', 'RETAIL'], { message: 'Намуди фурӯш нодуруст аст' })
  saleType?: SaleType;

  @IsOptional()
  @IsString({ message: 'Ҷустуҷӯ нодуруст аст' })
  search?: string;
}
