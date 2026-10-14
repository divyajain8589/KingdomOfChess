import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';
import { SocketIoAdapter } from './game/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.getOrThrow<string>('FRONTEND_URL');

  app.enableShutdownHooks();
  // Number of reverse proxies in front of the API, so req.ip (rate limiting) is the real client.
  app.set('trust proxy', config.get<number>('TRUST_PROXY') ?? 0);
  // Security headers; also drops X-Powered-By. The web app is a different origin but the same site.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.enableCors({ origin: frontendUrl, credentials: true });

  // /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new SocketIoAdapter(app, frontendUrl));

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
  console.log(`API on http://localhost:${port}/api/v1`);
}

bootstrap();
