import { io, type Socket } from "socket.io-client";
import { api, ApiError } from "./api";
import { API_URL } from "./config";

let socket: Socket | null = null;

/**
 * One shared connection per tab, straight to the API. The session cookie can't be sent there when the API
 * is on another site (and Safari blocks it anyway), so each (re)connect fetches a 60-second socket token.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: (cb) => {
        api<{ token: string }>("/auth/socket-token").then(
          ({ token }) => cb({ token }),
          () => cb({}), // signed out: the handshake is refused and the app sends the user to /login
        );
      },
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

type Ack<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

/** Emit with an acknowledgement; resolves with data or rejects with ApiError. Times out so nothing hangs. */
export function emitAck<T>(event: string, payload: unknown, timeoutMs = 8000): Promise<T> {
  const s = getSocket();
  return new Promise<T>((resolve, reject) => {
    if (!s.connected) {
      reject(new ApiError("Not connected to the game server — reconnecting…", "DISCONNECTED", 0));
      return;
    }
    s.timeout(timeoutMs).emit(event, payload, (err: Error | null, ack: Ack<T>) => {
      if (err) return reject(new ApiError("The server didn't respond in time", "TIMEOUT", 0));
      if (ack.ok) resolve(ack.data);
      else reject(new ApiError(ack.error.message, ack.error.code, 0));
    });
  });
}
