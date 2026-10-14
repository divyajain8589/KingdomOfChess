import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SessionCookieService } from '../auth/session-cookie.service';
import { AuthUser, CurrentUser, Roles } from '../common/auth.decorators';
import { ChangeOwnPasswordDto, CreateStudentDto, SetPasswordDto } from './users.dto';
import { UsersService } from './users.service';

@Roles('coach')
@Controller('students')
export class StudentsController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.listStudents();
  }

  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.users.createStudent(dto);
  }

  @Patch(':id/password')
  setPassword(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: SetPasswordDto) {
    return this.users.setStudentPassword(id, dto.password);
  }
}

@Controller('me')
export class AccountController {
  constructor(
    private readonly users: UsersService,
    private readonly cookies: SessionCookieService,
  ) {}

  /** Change your own password. Every other session ends; this one gets a fresh cookie. */
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangeOwnPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.users.changeOwnPassword(user.id, dto.currentPassword, dto.newPassword);
    await this.cookies.issue(res, user);
    return { changed: true };
  }
}
