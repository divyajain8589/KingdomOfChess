/** For standalone scripts (migrate/seed): pick up backend/.env if present. Real env vars win. */
export function loadEnv() {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file — rely on the environment (e.g. Docker).
  }
}
