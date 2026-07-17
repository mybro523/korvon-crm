import './polyfill';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import 'reflect-metadata';
import { AppModule } from './app.module';

// защита в глубину: необработанный reject не должен ронять сервер
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // фото товара приходит base64-строкой в JSON — поднимаем лимит тела
  app.useBodyParser('json', { limit: '6mb' });

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Korvon API: http://localhost:${port}/api`);
}

bootstrap();
