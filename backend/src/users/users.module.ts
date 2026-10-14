import { Module } from '@nestjs/common';
import { AccountController, StudentsController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [StudentsController, AccountController],
  providers: [UsersService],
})
export class UsersModule {}
