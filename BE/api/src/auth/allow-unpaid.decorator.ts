import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNPAID_KEY = 'allowUnpaid';

/** Exempts a route from SubscriptionGuard's ADMIN payment-lock check (e.g. the billing/Connect routes a locked-out admin still needs to reach). */
export const AllowUnpaid = () => SetMetadata(ALLOW_UNPAID_KEY, true);
