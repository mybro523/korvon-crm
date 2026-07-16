import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Номи корбарро ворид кунед' })
  @IsNotEmpty({ message: 'Номи корбарро ворид кунед' })
  username: string;

  @IsString({ message: 'Гузарвожаро ворид кунед' })
  @IsNotEmpty({ message: 'Гузарвожаро ворид кунед' })
  password: string;
}
