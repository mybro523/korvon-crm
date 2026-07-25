import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryExpensesDto {
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
  @IsString({ message: 'Ҷустуҷӯ нодуруст аст' })
  search?: string;
}
