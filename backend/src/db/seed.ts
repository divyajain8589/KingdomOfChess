import * as bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { createDb } from './db';
import { loadEnv } from './load-env';
import { tournamentParticipants, tournaments, users } from './schema';

/**
 * Idempotent demo data: 1 coach, 6 students and three tournaments (one ongoing with four players
 * ready to be matched, one open for self-registration, one draft).
 * Safe to run repeatedly — existing rows are left alone. `--reset` wipes all data first.
 */
const PASSWORD = 'password123';

const SEED_USERS = [
  { email: 'coach@koc.test', name: 'Coach Anand', role: 'coach' as const },
  { email: 'aarav@koc.test', name: 'Aarav Sharma', role: 'student' as const },
  { email: 'diya@koc.test', name: 'Diya Patel', role: 'student' as const },
  { email: 'kabir@koc.test', name: 'Kabir Singh', role: 'student' as const },
  { email: 'meera@koc.test', name: 'Meera Iyer', role: 'student' as const },
  { email: 'rohan@koc.test', name: 'Rohan Gupta', role: 'student' as const },
  { email: 'saanvi@koc.test', name: 'Saanvi Reddy', role: 'student' as const },
];

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, pool } = createDb(url);

  if (process.argv.includes('--reset')) {
    await db.execute(sql`truncate active_players, matches, tournament_participants, tournaments, users cascade`);
    console.log('Wiped existing data');
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await db
    .insert(users)
    .values(SEED_USERS.map((u) => ({ ...u, passwordHash })))
    .onConflictDoNothing({ target: users.email });

  const all = await db.select().from(users);
  const byEmail = new Map(all.map((u) => [u.email, u]));
  const coach = byEmail.get('coach@koc.test')!;

  const existing = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.createdById, coach.id));
  if (existing.length === 0) {
    const day = 24 * 60 * 60 * 1000;
    const [blitz, rapid] = await db
      .insert(tournaments)
      .values([
        {
          name: 'Saturday Blitz Arena',
          description: 'Quick 5-minute games. Everyone plays everyone once.',
          timeControlMinutes: 5,
          incrementSeconds: 0,
          startsAt: new Date(Date.now() - 60 * 60 * 1000),
          status: 'ongoing',
          createdById: coach.id,
        },
        {
          name: 'Junior Rapid Cup',
          description: 'Registration is open — join from the student dashboard.',
          timeControlMinutes: 10,
          incrementSeconds: 5,
          startsAt: new Date(Date.now() + 2 * day),
          status: 'open',
          createdById: coach.id,
        },
        {
          name: 'Monsoon Classical (draft)',
          description: 'Still being planned; students cannot see drafts.',
          timeControlMinutes: 15,
          incrementSeconds: 10,
          startsAt: new Date(Date.now() + 14 * day),
          status: 'draft',
          createdById: coach.id,
        },
      ])
      .returning();

    const blitzPlayers = ['aarav', 'diya', 'kabir', 'meera'].map((n) => byEmail.get(`${n}@koc.test`)!.id);
    await db.insert(tournamentParticipants).values(blitzPlayers.map((userId) => ({ tournamentId: blitz.id, userId })));
    await db
      .insert(tournamentParticipants)
      .values([{ tournamentId: rapid.id, userId: byEmail.get('rohan@koc.test')!.id }]);
  }

  await pool.end();
  console.log(`Seeded ${SEED_USERS.length} users (password: ${PASSWORD}) and demo tournaments`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
