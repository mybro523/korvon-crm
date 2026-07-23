import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_MONEY, MAX_QTY, MSG_TOO_BIG } from '../../sales/dto/create-sale.dto';

export class CreateProductDto {
  @IsString({ message: 'Номи молро ворид кунед' })
  @IsNotEmpty({ message: 'Номи молро ворид кунед' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Категория нодуруст аст' })
  category?: string;

  @IsString({ message: 'Воҳиди ченакро ворид кунед' })
  @IsNotEmpty({ message: 'Воҳиди ченакро ворид кунед' })
  unit: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Арзиши аслӣ нодуруст аст' })
  @Min(0, { message: 'Арзиши аслӣ манфӣ буда наметавонад' })
  @Max(MAX_MONEY, { message: MSG_TOO_BIG })
  costPrice: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Миқдор нодуруст аст' })
  @Min(0, { message: 'Миқдор манфӣ буда наметавонад' })
  @Max(MAX_QTY, { message: MSG_TOO_BIG })
  quantity: number;

  /** остаток сразу в точке продажи (по умолчанию 0 — всё поступает на склад) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Миқдор дар нуқтаи фурӯш нодуруст аст' })
  @Min(0, { message: 'Миқдор манфӣ буда наметавонад' })
  @Max(MAX_QTY, { message: MSG_TOO_BIG })
  shopQty?: number;

  @IsOptional()
  @IsString({ message: 'Тавсиф нодуруст аст' })
  @MaxLength(2000, { message: 'Тавсиф хеле дароз аст' })
  description?: string;

  /** порог оповещения «мало товара в точке» */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Ҳадди огоҳӣ нодуруст аст' })
  @Min(0, { message: 'Ҳадди огоҳӣ манфӣ буда наметавонад' })
  @Max(MAX_QTY, { message: MSG_TOO_BIG })
  lowStockThreshold?: number;

  @IsDateString({}, { message: 'Санаи воридот нодуруст аст' })
  arrivalDate: string;

  /** data-URL (image/jpeg|png|webp) или '' для удаления */
  @IsOptional()
  @IsString({ message: 'Формати сурат нодуруст аст' })
  @MaxLength(3_000_000, { message: 'Сурат хеле калон аст' })
  photo?: string;
}
