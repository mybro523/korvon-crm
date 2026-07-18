import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../../entities';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Ному насаб нодуруст аст' })
  @IsNotEmpty({ message: 'Ному насаб холӣ буда наметавонад' })
  fullName?: string;

  @IsOptional()
  @IsString({ message: 'Номи корбар нодуруст аст' })
  @MinLength(3, { message: 'Номи корбар бояд на камтар аз 3 аломат бошад' })
  username?: string;

  /** пустая строка = не менять пароль */
  @ValidateIf((o) => o.password !== undefined && o.password !== '')
  @IsString({ message: 'Гузарвожа нодуруст аст' })
  @MinLength(6, { message: 'Гузарвожа бояд на камтар аз 6 аломат бошад' })
  password?: string;

  @IsOptional()
  @IsIn(['OWNER', 'SELLER'], { message: 'Нақши нодуруст' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean({ message: 'Ҳолати нодуруст' })
  isActive?: boolean;
}
