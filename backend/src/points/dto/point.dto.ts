import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { MAX_QTY, MSG_TOO_BIG } from '../../sales/dto/create-sale.dto';

export class CreatePointDto {
  @IsString({ message: 'Номи нуқтаро ворид кунед' })
  @IsNotEmpty({ message: 'Номи нуқтаро ворид кунед' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Суроға нодуруст аст' })
  address?: string;
}

export class UpdatePointDto {
  @IsOptional()
  @IsString({ message: 'Номи нуқта нодуруст аст' })
  @IsNotEmpty({ message: 'Номи нуқта холӣ буда наметавонад' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Суроға нодуруст аст' })
  address?: string;
}

export class TransferDto {
  @IsUUID('4', { message: 'Мол нодуруст аст' })
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Миқдор нодуруст аст' })
  @Min(0.001, { message: 'Миқдор бояд аз сифр зиёд бошад' })
  @Max(MAX_QTY, { message: MSG_TOO_BIG })
  quantity: number;
}
