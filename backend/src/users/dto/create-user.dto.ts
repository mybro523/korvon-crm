import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { UserRole } from '../../entities';

export class CreateUserDto {
  @IsString({ message: 'Ному насабро ворид кунед' })
  @IsNotEmpty({ message: 'Ному насабро ворид кунед' })
  fullName: string;

  @IsString({ message: 'Номи корбарро ворид кунед' })
  @MinLength(3, { message: 'Номи корбар бояд на камтар аз 3 аломат бошад' })
  username: string;

  @IsString({ message: 'Гузарвожаро ворид кунед' })
  @MinLength(6, { message: 'Гузарвожа бояд на камтар аз 6 аломат бошад' })
  password: string;

  @IsIn(['OWNER', 'SELLER'], { message: 'Нақши нодуруст' })
  role: UserRole;

  @IsOptional()
  @IsUUID('4', { message: 'Нуқтаи фурӯш нодуруст аст' })
  pointId?: string;
}
