import { IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  code: string;

  @IsOptional()
  userInfo?: {
    nickName: string;
    avatarUrl: string;
  };
}
