/**
 * Where the NestJS API lives, as seen from the browser. Only the Socket.IO connection goes here directly;
 * REST calls use same-origin `/api/v1` (proxied by next.config.ts) so the session cookie stays first-party.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
