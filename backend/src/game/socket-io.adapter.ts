import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly frontendUrl: string,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.frontendUrl, credentials: true },
      // Every client event is a few small fields; the 1 MB default only invites abuse.
      maxHttpBufferSize: 16 * 1024,
    });
  }
}
