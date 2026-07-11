import { BadRequestException, Controller, Get, Headers, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { StripeService } from './stripe.service.js';
import { Roles } from '../auth/roles.decorator.js';
import { AllowUnpaid } from '../auth/allow-unpaid.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // ── Subscription billing (ADMIN -> SUPERADMIN) ──

  @Post('subscription/checkout')
  @Roles(Role.ADMIN)
  @AllowUnpaid()
  async createSubscriptionCheckout(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.stripeService.createSubscriptionCheckoutSession(user.id);
    if (!result.success) throw new BadRequestException(result.error);
    return { url: result.url };
  }

  @Post('subscription/portal')
  @Roles(Role.ADMIN)
  @AllowUnpaid()
  async createSubscriptionPortal(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.stripeService.createBillingPortalSession(user.id);
    if (!result.success) throw new BadRequestException(result.error);
    return { url: result.url };
  }

  @Get('subscription/status')
  @Roles(Role.ADMIN)
  @AllowUnpaid()
  getSubscriptionStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.stripeService.getSubscriptionStatus(user.id);
  }

  // ── Stripe Connect (CUSTOMER -> owning admin/superadmin) ──

  @Post('connect/onboarding-link')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @AllowUnpaid()
  async createConnectOnboardingLink(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.stripeService.createConnectOnboardingLink(user.id);
    if (!result.success) throw new BadRequestException(result.error);
    return { url: result.url };
  }

  @Get('connect/status')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @AllowUnpaid()
  getConnectStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.stripeService.getConnectStatus(user.id);
  }

  // ── Customer bill payment ──

  @Post('customer-payment/checkout')
  @Roles(Role.CUSTOMER)
  async createCustomerPaymentCheckout(@CurrentUser() user: AuthenticatedUser) {
    if (!user.customerId) throw new BadRequestException('No customer account linked.');
    const result = await this.stripeService.createCustomerPaymentCheckoutSession(user.customerId);
    if (!result.success) throw new BadRequestException(result.error);
    return { url: result.url };
  }

  // ── Webhook ──

  @Public()
  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    if (!this.stripeService.isWebhookConfigured()) throw new ServiceUnavailableException('Webhooks are not configured.');
    if (!req.rawBody) throw new BadRequestException('Missing request body.');
    const result = this.stripeService.verifyWebhookSignature(req.rawBody, signature);
    if (!result.success) throw new BadRequestException(result.error);
    await this.stripeService.handleWebhookEvent(result.event);
    return { received: true };
  }
}
