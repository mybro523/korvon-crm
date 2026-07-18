import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AnalyticsQueryDto {
  @IsDateString({}, { message: 'Санаи аввал нодуруст аст' })
  from: string;

  @IsDateString({}, { message: 'Санаи охир нодуруст аст' })
  to: string;

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
