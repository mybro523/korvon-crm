import { User } from '../entities';

/** данные пользователя без passwordHash — для ответов API */
export function publicUser(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    telegramConnected: !!user.telegramChatId,
    createdAt: user.createdAt,
  };
}
