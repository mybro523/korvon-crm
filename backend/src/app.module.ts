import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { ALL_ENTITIES } from './entities';
import { ExportModule } from './export/export.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PointsModule } from './points/points.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { SeedService } from './seed/seed.service';
import { SettingsModule } from './settings/settings.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: ALL_ENTITIES,
        synchronize: true,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'JWT_SECRET не задан! Укажите его в .env (локально) или в переменных окружения (Railway).',
          );
        }
        return { secret, signOptions: { expiresIn: '7d' } };
      },
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    PointsModule,
    SalesModule,
    AnalyticsModule,
    NotificationsModule,
    SettingsModule,
    TelegramModule,
    ExportModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
