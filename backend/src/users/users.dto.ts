import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsNewPassword } from './password';

export class CreateStudentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email!: string;

  @IsNewPassword()
  password!: string;
}

export class SetPasswordDto {
  @IsNewPassword()
  password!: string;
}

export class ChangeOwnPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Enter your current password' })
  @MaxLength(128)
  currentPassword!: string;

  @IsNewPassword()
  newPassword!: string;
}
