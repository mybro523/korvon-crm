import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  @IsDateString({}, { message: 'Санаи воридот нодуруст аст' })
  arrivalDate: string;
}
