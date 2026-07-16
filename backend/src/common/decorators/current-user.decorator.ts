import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => ctx.switchToHttp().getRequest().user,
);
