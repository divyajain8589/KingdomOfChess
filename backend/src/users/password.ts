import { applyDecorators } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Same cost as the seed and the login dummy hash, so login timing stays uniform. */
export const hashPassword = (password: string) => bcrypt.hash(password, 10);

/** Rules for any password a person chooses. bcrypt only reads the first 72 bytes, so that is the cap. */
export const IsNewPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(8, { message: 'Password must be at least 8 characters' }),
    MaxLength(72, { message: 'Password must be at most 72 characters' }),
  );
