import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service.js';
import { BillingService } from '../billing/billing.service.js';
import { Roles } from '../auth/roles.decorator.js';
import { AllowUnpaid } from '../auth/allow-unpaid.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { assertCustomerOwned, customerWhere } from '../auth/ownership.util.js';
import { RejectClaimDto, SetWhishPhoneNumberDto, SubmitClaimDto } from './dto/whish.dto.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Whish Money (a Lebanese payment app) as a manual-confirmation alternative to
// Stripe — no live merchant API is used (see plan notes): the payer sends
// money to the recipient's published Whish number, submits a transaction
// reference here, and the receiving side approves/rejects. Approval of a
// customer bill claim reuses BillingService.applyPaymentSnapshot, the exact
// same code path the Stripe webhook uses, so both payment methods leave
// billing rows in an identical state.
@ApiTags('Whish Money')
@Controller('whish')
export class WhishController {
  constructor(
    private readonly db: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  // ── Subscription billing (ADMIN -> SUPERADMIN) ──

  @Get('subscription/recipient')
  @Roles(Role.ADMIN)
  @AllowUnpaid()
  async getSubscriptionRecipient(@CurrentUser() user: AuthenticatedUser) {
    const superadmin = await this.db.user.findFirst({
      where: { role: Role.SUPERADMIN },
      select: { whishPhoneNumber: true },
    });
    const pricing = await this.billingService.getAdminSubscriptionPricing(user.id);
    return {
      phoneNumber: superadmin?.whishPhoneNumber ?? null,
      priceUsd: pricing.amountUsd,
      customerCount: pricing.customerCount,
      pricePerCustomerUsd: pricing.pricePerCustomerUsd,
    };
  }

  @Post('subscription/claims')
  @Roles(Role.ADMIN)
  @AllowUnpaid()
  async submitSubscriptionClaim(@Body() dto: SubmitClaimDto, @CurrentUser() user: AuthenticatedUser) {
    const pricing = await this.billingService.getAdminSubscriptionPricing(user.id);
    return this.db.subscriptionPaymentClaim.create({
      data: {
        adminUserId: user.id,
        amountClaimed: pricing.amountUsd,
        referenceNumber: dto.referenceNumber,
        note: dto.note,
      },
    });
  }

  @Get('subscription/claims/mine')
  @Roles(Role.ADMIN)
  @AllowUnpaid()
  getMySubscriptionClaims(@CurrentUser() user: AuthenticatedUser) {
    return this.db.subscriptionPaymentClaim.findMany({
      where: { adminUserId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('subscription/claims')
  @Roles(Role.SUPERADMIN)
  getPendingSubscriptionClaims() {
    return this.db.subscriptionPaymentClaim.findMany({
      where: { status: 'pending' },
      include: { admin: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('subscription/claims/:id/approve')
  @Roles(Role.SUPERADMIN)
  async approveSubscriptionClaim(@Param('id') id: string) {
    const claim = await this.db.subscriptionPaymentClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found.');
    if (claim.status !== 'pending') throw new BadRequestException('Claim already reviewed.');

    const admin = await this.db.user.findUniqueOrThrow({
      where: { id: claim.adminUserId },
      select: { subscriptionCurrentPeriodEnd: true },
    });
    const base = admin.subscriptionCurrentPeriodEnd && admin.subscriptionCurrentPeriodEnd > new Date() ? admin.subscriptionCurrentPeriodEnd : new Date();
    const newPeriodEnd = new Date(base.getTime() + THIRTY_DAYS_MS);

    await this.db.$transaction([
      this.db.subscriptionPaymentClaim.update({ where: { id }, data: { status: 'approved', reviewedAt: new Date() } }),
      this.db.user.update({ where: { id: claim.adminUserId }, data: { subscriptionStatus: 'active', subscriptionCurrentPeriodEnd: newPeriodEnd } }),
    ]);
    return { success: true };
  }

  @Post('subscription/claims/:id/reject')
  @Roles(Role.SUPERADMIN)
  async rejectSubscriptionClaim(@Param('id') id: string, @Body() dto: RejectClaimDto) {
    const claim = await this.db.subscriptionPaymentClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found.');
    if (claim.status !== 'pending') throw new BadRequestException('Claim already reviewed.');

    return this.db.subscriptionPaymentClaim.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date(), ...(dto.note ? { note: dto.note } : {}) },
    });
  }

  // ── Customer bill payment ──

  @Get('customer-payment/recipient')
  @Roles(Role.CUSTOMER)
  async getCustomerPaymentRecipient(@CurrentUser() user: AuthenticatedUser) {
    if (!user.customerId) throw new BadRequestException('No customer account linked.');
    const customer = await this.db.customer.findUnique({
      where: { id: user.customerId },
      select: {
        consumptionType: {
          select: { generatorGroup: { select: { region: { select: { owner: { select: { whishPhoneNumber: true } } } } } } },
        },
      },
    });
    return { phoneNumber: customer?.consumptionType.generatorGroup.region.owner.whishPhoneNumber ?? null };
  }

  @Post('customer-payment/claims')
  @Roles(Role.CUSTOMER)
  async submitCustomerPaymentClaim(@Body() dto: SubmitClaimDto, @CurrentUser() user: AuthenticatedUser) {
    if (!user.customerId) throw new BadRequestException('No customer account linked.');
    const customerId = user.customerId;

    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
      select: {
        consumptionType: { select: { generatorGroup: { select: { region: { select: { owner: { select: { id: true } } } } } } } },
      },
    });
    const ownerId = customer?.consumptionType.generatorGroup.region.owner.id;
    if (!ownerId) throw new BadRequestException('Customer not found.');

    const snapshot = await this.billingService.getCustomerOutstandingSnapshot(customerId);
    if (snapshot.total <= 0.001) throw new BadRequestException('No outstanding balance to pay.');

    return this.db.payment.create({
      data: {
        customerId,
        adminUserId: ownerId,
        amount: snapshot.total,
        currency: 'usd',
        status: 'pending_review',
        method: 'whish',
        referenceNumber: dto.referenceNumber,
        stripeCheckoutSessionId: `whish_${customerId}_${Date.now()}`,
        snapshot: { consumptions: snapshot.consumptions, deposits: snapshot.deposits },
      },
    });
  }

  @Get('customer-payment/claims')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  listCustomerPaymentClaims(@CurrentUser() user: AuthenticatedUser) {
    return this.db.payment.findMany({
      where: { method: 'whish', status: 'pending_review', customer: customerWhere(user) },
      include: { customer: { select: { firstName: true, middleName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('customer-payment/claims/:id/approve')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async approveCustomerPaymentClaim(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const claim = await this.db.payment.findUnique({ where: { id } });
    if (!claim || claim.method !== 'whish') throw new NotFoundException('Claim not found.');
    await assertCustomerOwned(this.db, user, claim.customerId);
    if (claim.status !== 'pending_review') throw new BadRequestException('Claim already reviewed.');

    await this.billingService.applyPaymentSnapshot(id);
    return { success: true };
  }

  @Post('customer-payment/claims/:id/reject')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async rejectCustomerPaymentClaim(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const claim = await this.db.payment.findUnique({ where: { id } });
    if (!claim || claim.method !== 'whish') throw new NotFoundException('Claim not found.');
    await assertCustomerOwned(this.db, user, claim.customerId);
    if (claim.status !== 'pending_review') throw new BadRequestException('Claim already reviewed.');

    return this.db.payment.update({ where: { id }, data: { status: 'rejected' } });
  }

  // ── Shared ──

  @Patch('phone-number')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @AllowUnpaid()
  setPhoneNumber(@Body() dto: SetWhishPhoneNumberDto, @CurrentUser() user: AuthenticatedUser) {
    return this.db.user.update({
      where: { id: user.id },
      data: { whishPhoneNumber: dto.phoneNumber },
      select: { whishPhoneNumber: true },
    });
  }
}
