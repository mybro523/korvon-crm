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
import { SaleSource } from '../../entities';

export class AnalyticsQueryDto {
  @IsDateString({}, { message: 'Санаи аввал нодуруст аст' })
  from: string;

  @IsDateString({}, { message: 'Санаи охир нодуруст аст' })
  to: string;

  @IsOptional()
  @IsUUID('4', { message: 'Нуқтаи фурӯш нодуруст аст' })
  pointId?: string;

  @IsOptional()
  @IsIn(['WAREHOUSE', 'POINT'], { message: 'Ҷои фурӯш нодуруст аст' })
  source?: SaleSource;

  @IsOptional()
  @IsString()
  tz?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
