import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';
import { MAX_MONEY, MSG_TOO_BIG } from '../../sales/dto/create-sale.dto';

export class CreateExpenseDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Маблағ нодуруст аст' })
  @Min(0.01, { message: 'Маблағ бояд аз сифр зиёд бошад' })
  @Max(MAX_MONEY, { message: MSG_TOO_BIG })
  amount: number;

  // тримим ДО валидации — иначе комментарий из одних пробелов проходит @IsNotEmpty
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Шарҳ нодуруст аст' })
  @IsNotEmpty({ message: 'Шарҳро ворид кунед' })
  @MaxLength(500, { message: 'Шарҳ хеле дароз аст' })
  comment: string;
}
