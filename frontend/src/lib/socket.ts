import { io, type Socket } from "socket.io-client";
import { ApiError } from "./api";
import { API_URL } from "./config";

let socket: Socket | null = null;

/** One shared connection per tab. Auth rides on the httpOnly cookie (withCredentials). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { withCredentials: true, autoConnect: false, transports: ["websocket", "polling"] });
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
