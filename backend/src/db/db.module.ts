import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { createDb, Database } from './db';

export const DB = Symbol('DB');
const POOL = Symbol('POOL');

/** Inject the Drizzle client with `@InjectDb() private readonly db: Database`. */
export const InjectDb = () => Inject(DB);

@Global()
@Module({
  providers: [
    {
      provide: POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createDb(config.getOrThrow('DATABASE_URL')),
    },
    { provide: DB, inject: [POOL], useFactory: (c: { db: Database }) => c.db },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly conn: { pool: Pool }) {}

  async onApplicationShutdown() {
    await this.conn.pool.end();
  }
}
