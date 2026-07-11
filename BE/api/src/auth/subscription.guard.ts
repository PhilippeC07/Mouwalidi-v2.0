import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { ALLOW_UNPAID_KEY } from './allow-unpaid.decorator.js';
import { Role } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from './current-user.decorator.js';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

const UNLOCKED_STATUSES = new Set(['active', 'trialing']);

/**
 * Applied globally (see AppModule), after RolesGuard. Only ever gates ADMIN
 * requests — SUPERADMIN and CUSTOMER are never subscription-gated. Re-reads
 * subscriptionStatus from the DB on every request rather than trusting the
 * (up to 7-day-old) JWT, since a subscription can lapse mid-session.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    if (!user || user.role !== Role.ADMIN) return true;

    const allowUnpaid = this.reflector.getAllAndOverride<boolean>(ALLOW_UNPAID_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowUnpaid) return true;

    const dbUser = await this.db.user.findUnique({ where: { id: user.id }, select: { subscriptionStatus: true } });
    if (!UNLOCKED_STATUSES.has(dbUser?.subscriptionStatus ?? '')) {
      throw new HttpException('Your subscription is inactive. Please reactivate billing to continue.', HttpStatus.PAYMENT_REQUIRED);
    }
    return true;
  }
}
