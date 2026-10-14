import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { AppException, notFound } from '../common/app-exception';
import { AuthUser } from '../common/auth.decorators';
import { Database } from '../db/db';
import { InjectDb } from '../db/db.module';
import { users } from '../db/schema';

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = '$2b$10$IY0OgDz9mRyu.pzhbDGdOOJGf/hNUF6Id/t7eZlIiQp6ja7JWWmVu';

@Injectable()
export class AuthService {
  constructor(@InjectDb() private readonly db: Database) {}

  async validate(email: string, password: string): Promise<AuthUser> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Incorrect email or password');
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async me(id: string): Promise<AuthUser> {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw notFound('User');
    return user;
  }
}
