import { User } from '../entities';

/** данные пользователя без passwordHash — для ответов API */
export function publicUser(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    pointId: user.pointId ?? null,
    point: user.point ? { id: user.point.id, name: user.point.name } : null,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
