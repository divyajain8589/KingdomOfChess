import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, asc, eq, sql } from 'drizzle-orm';
import { AppException, conflict, notFound } from '../common/app-exception';
import { Database } from '../db/db';
import { InjectDb } from '../db/db.module';
import { users } from '../db/schema';
import { hashPassword } from './password';
import { CreateStudentDto } from './users.dto';

const PG_UNIQUE_VIOLATION = '23505';
const emailTaken = () => conflict('EMAIL_TAKEN', 'An account with this email already exists');

const studentColumns = { id: users.id, name: users.name, email: users.email };

/** Student accounts, managed by coaches, and each user's own password. */
@Injectable()
export class UsersService {
  constructor(@InjectDb() private readonly db: Database) {}

  listStudents() {
    return this.db.select(studentColumns).from(users).where(eq(users.role, 'student')).orderBy(asc(users.name));
  }

  async createStudent(dto: CreateStudentDto) {
    const [existing] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, dto.email)).limit(1);
    if (existing) throw emailTaken();
    try {
      const [student] = await this.db
        .insert(users)
        .values({ name: dto.name, email: dto.email, role: 'student', passwordHash: await hashPassword(dto.password) })
        .returning(studentColumns);
      return student;
    } catch (err) {
      // Two coaches adding the same email at once: the unique index decides.
      const code = (err as { code?: string; cause?: { code?: string } }).code ?? (err as { cause?: { code?: string } }).cause?.code;
      if (code === PG_UNIQUE_VIOLATION) throw emailTaken();
      throw err;
    }
  }

  /** Coach reset. Only student accounts; signs the student out of every device. */
  async setStudentPassword(id: string, password: string) {
    const [student] = await this.db
      .update(users)
      .set({ passwordHash: await hashPassword(password), tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(and(eq(users.id, id), eq(users.role, 'student')))
      .returning(studentColumns);
    if (!student) throw notFound('Student');
    return student;
  }

  /** Any signed-in user. Requires the current password; signs out every other session. */
  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await this.db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw notFound('User');
    if (!(await bcrypt.compare(currentPassword, user.hash))) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'WRONG_PASSWORD', 'Your current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'SAME_PASSWORD', 'Choose a password different from your current one');
    }
    await this.db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, userId));
  }
}
