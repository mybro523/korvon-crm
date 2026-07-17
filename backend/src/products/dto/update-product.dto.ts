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

export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'Номи мол нодуруст аст' })
  @IsNotEmpty({ message: 'Номи мол холӣ буда наметавонад' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Категория нодуруст аст' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'Воҳиди ченак нодуруст аст' })
  @IsNotEmpty({ message: 'Воҳиди ченак холӣ буда наметавонад' })
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Арзиши аслӣ нодуруст аст' })
  @Min(0, { message: 'Арзиши аслӣ манфӣ буда наметавонад' })
  @Max(MAX_MONEY, { message: MSG_TOO_BIG })
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Миқдор нодуруст аст' })
  @Min(0, { message: 'Миқдор манфӣ буда наметавонад' })
  @Max(MAX_QTY, { message: MSG_TOO_BIG })
  quantity?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Санаи воридот нодуруст аст' })
  arrivalDate?: string;

  /** data-URL (image/jpeg|png|webp) или '' для удаления */
  @IsOptional()
  @IsString({ message: 'Формати сурат нодуруст аст' })
  @MaxLength(3_000_000, { message: 'Сурат хеле калон аст' })
  photo?: string;
}
