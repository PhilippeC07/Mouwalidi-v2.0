import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '../generated/prisma/client.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  customerId: string | null;
}

interface RequestWithUser {
  user: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.user;
});
