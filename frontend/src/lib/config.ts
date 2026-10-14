/** Where the NestJS API lives. Browser-side, so it must be reachable from the user's machine. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
