import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  async findAll(page = 1, limit = 20, unreadOnly = false) {
    const where = unreadOnly ? { isRead: false } : {};
    const [items, total] = await this.notificationsRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unreadCount = await this.notificationsRepo.count({ where: { isRead: false } });
    return { items, total, page, limit, unreadCount };
  }

  async unreadCount() {
    return { count: await this.notificationsRepo.count({ where: { isRead: false } }) };
  }

  async markRead(id: string) {
    const notification = await this.notificationsRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Огоҳинома ёфт нашуд');
    notification.isRead = true;
    return this.notificationsRepo.save(notification);
  }

  async markAllRead() {
    await this.notificationsRepo.update({ isRead: false }, { isRead: true });
    return { success: true };
  }
}
