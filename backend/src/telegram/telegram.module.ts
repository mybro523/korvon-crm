import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramLinkCode, User } from '../entities';
import { SettingsModule } from '../settings/settings.module';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, TelegramLinkCode]), SettingsModule],
  controllers: [TelegramController],
})
export class TelegramModule {}
