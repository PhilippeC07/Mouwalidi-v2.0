import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service.js';
import { BillingService } from '../billing/billing.service.js';

export interface StripeResult {
  success: boolean;
  error?: string;
}

export interface StripeUrlResult extends StripeResult {
  url?: string;
}

type StripeFailure = { success: false; error: string };

const LOCKED_OUT_STATUSES = new Set(['active', 'trialing']);

// Talks to Stripe for two separate flows: (1) an ADMIN's recurring platform
// subscription paid to the SUPERADMIN, and (2) a CUSTOMER's one-off bill
// payment, routed as a destination charge directly to the owning admin's
// connected Stripe account. Every hosted flow (Checkout, Billing Portal,
// Connect onboarding) returns a URL for the frontend to redirect to — no
// Stripe Elements/frontend SDK is used anywhere.
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  private get secretKey() {
    return process.env.STRIPE_SECRET_KEY;
  }

  private get webhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }

  private get subscriptionPriceId() {
    return process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  }

  private get frontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  private _client: Stripe | undefined;
  private get client(): Stripe {
    this._client ??= new Stripe(this.secretKey!);
    return this._client;
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  isWebhookConfigured(): boolean {
    return Boolean(this.webhookSecret);
  }

  /** SUPERADMIN never gated; ADMIN must have an active/trialing subscription. */
  isSubscriptionActive(status: string | null | undefined): boolean {
    return LOCKED_OUT_STATUSES.has(status ?? '');
  }

  // ── Subscription billing (ADMIN -> SUPERADMIN) ──

  async ensureSubscriptionCustomer(adminUserId: string): Promise<{ success: true; stripeCustomerId: string } | StripeFailure> {
    if (!this.isConfigured()) return { success: false, error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' };
    try {
      const user = await this.db.user.findUniqueOrThrow({ where: { id: adminUserId } });
      if (user.stripeCustomerId) return { success: true, stripeCustomerId: user.stripeCustomerId };

      const customer = await this.client.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { appUserId: user.id },
      });
      await this.db.user.update({ where: { id: adminUserId }, data: { stripeCustomerId: customer.id } });
      return { success: true, stripeCustomerId: customer.id };
    } catch (e) {
      this.logger.error('ensureSubscriptionCustomer failed', e as Error);
      return { success: false, error: (e as Error).message };
    }
  }

  async createSubscriptionCheckoutSession(adminUserId: string): Promise<StripeUrlResult> {
    if (!this.isConfigured()) return { success: false, error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' };
    if (!this.subscriptionPriceId) return { success: false, error: 'Subscription plan is not configured (missing STRIPE_SUBSCRIPTION_PRICE_ID).' };

    const ensured = await this.ensureSubscriptionCustomer(adminUserId);
    if (!ensured.success) return ensured;

    // Billed per customer/month — STRIPE_SUBSCRIPTION_PRICE_ID must be configured in the
    // Stripe Dashboard as a per-unit recurring Price at billingService.pricePerCustomerUsd.
    // Quantity is floored at 1 since Stripe rejects a 0-quantity subscription line item.
    const { customerCount } = await this.billingService.getAdminSubscriptionPricing(adminUserId);
    const quantity = Math.max(customerCount, 1);

    try {
      const session = await this.client.checkout.sessions.create({
        mode: 'subscription',
        customer: ensured.stripeCustomerId,
        line_items: [{ price: this.subscriptionPriceId, quantity }],
        success_url: `${this.frontendUrl}/settings?billing=success`,
        cancel_url: `${this.frontendUrl}/settings?billing=cancel`,
        metadata: { adminUserId },
      });
      return { success: true, url: session.url! };
    } catch (e) {
      this.logger.error('createSubscriptionCheckoutSession failed', e as Error);
      return { success: false, error: (e as Error).message };
    }
  }

  /** Keeps a live subscription's billed quantity in sync with the admin's current customer count. Called after any customer create/delete. Silently no-ops if Stripe isn't configured or the admin has no active subscription — never throws, so it's safe to call without wrapping. */
  async syncSubscriptionQuantity(adminUserId: string): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      const user = await this.db.user.findUnique({ where: { id: adminUserId }, select: { stripeSubscriptionId: true } });
      if (!user?.stripeSubscriptionId) return;

      const sub = await this.client.subscriptions.retrieve(user.stripeSubscriptionId);
      const item = sub.items.data[0];
      if (!item) return;

      const { customerCount } = await this.billingService.getAdminSubscriptionPricing(adminUserId);
      const quantity = Math.max(customerCount, 1);
      if (item.quantity === quantity) return;

      await this.client.subscriptionItems.update(item.id, { quantity, proration_behavior: 'create_prorations' });
    } catch (e) {
      this.logger.error(`syncSubscriptionQuantity failed for admin ${adminUserId}`, e as Error);
    }
  }

  async createBillingPortalSession(adminUserId: string): Promise<StripeUrlResult> {
    if (!this.isConfigured()) return { success: false, error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' };
    try {
      const user = await this.db.user.findUniqueOrThrow({ where: { id: adminUserId } });
      if (!user.stripeCustomerId) return { success: false, error: 'No billing account yet.' };

      const session = await this.client.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${this.frontendUrl}/settings`,
      });
      return { success: true, url: session.url };
    } catch (e) {
      this.logger.error('createBillingPortalSession failed', e as Error);
      return { success: false, error: (e as Error).message };
    }
  }

  async getSubscriptionStatus(adminUserId: string): Promise<{
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    isLocked: boolean;
    customerCount: number;
    pricePerCustomerUsd: number;
    estimatedMonthlyUsd: number;
  }> {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: adminUserId },
      select: { subscriptionStatus: true, subscriptionCurrentPeriodEnd: true },
    });
    const pricing = await this.billingService.getAdminSubscriptionPricing(adminUserId);
    return {
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
      isLocked: !this.isSubscriptionActive(user.subscriptionStatus),
      customerCount: pricing.customerCount,
      pricePerCustomerUsd: pricing.pricePerCustomerUsd,
      estimatedMonthlyUsd: pricing.amountUsd,
    };
  }

  // ── Stripe Connect (CUSTOMER -> owning admin/superadmin destination charges) ──

  async ensureConnectAccount(userId: string): Promise<{ success: true; stripeConnectAccountId: string } | StripeFailure> {
    if (!this.isConfigured()) return { success: false, error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' };
    try {
      const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.stripeConnectAccountId) return { success: true, stripeConnectAccountId: user.stripeConnectAccountId };

      const account = await this.client.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { appUserId: user.id },
      });
      await this.db.user.update({ where: { id: userId }, data: { stripeConnectAccountId: account.id } });
      return { success: true, stripeConnectAccountId: account.id };
    } catch (e) {
      this.logger.error('ensureConnectAccount failed', e as Error);
      return { success: false, error: (e as Error).message };
    }
  }

  async createConnectOnboardingLink(userId: string): Promise<StripeUrlResult> {
    if (!this.isConfigured()) return { success: false, error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' };
    const ensured = await this.ensureConnectAccount(userId);
    if (!ensured.success) return ensured;

    try {
      const link = await this.client.accountLinks.create({
        account: ensured.stripeConnectAccountId,
        refresh_url: `${this.frontendUrl}/settings?connect=refresh`,
        return_url: `${this.frontendUrl}/settings?connect=return`,
        type: 'account_onboarding',
      });
      return { success: true, url: link.url };
    } catch (e) {
      this.logger.error('createConnectOnboardingLink failed', e as Error);
      return { success: false, error: (e as Error).message };
    }
  }

  async getConnectStatus(userId: string): Promise<{ connected: boolean; onboarded: boolean }> {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { stripeConnectAccountId: true, stripeConnectOnboarded: true },
    });
    return { connected: user.stripeConnectAccountId != null, onboarded: user.stripeConnectOnboarded };
  }

  // ── Customer bill payment (destination charge to the owning admin) ──

  async createCustomerPaymentCheckoutSession(customerId: string): Promise<StripeUrlResult> {
    if (!this.isConfigured()) return { success: false, error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' };

    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
      select: {
        consumptionType: {
          select: {
            generatorGroup: {
              select: {
                region: {
                  select: {
                    owner: {
                      select: { id: true, stripeConnectAccountId: true, stripeConnectOnboarded: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const owner = customer?.consumptionType.generatorGroup.region.owner;
    if (!owner) return { success: false, error: 'Customer not found.' };
    if (!owner.stripeConnectOnboarded || !owner.stripeConnectAccountId) {
      return { success: false, error: 'The admin managing this account has not finished payment setup yet. Please contact them.' };
    }

    const snapshot = await this.billingService.getCustomerOutstandingSnapshot(customerId);
    if (snapshot.total <= 0.001) return { success: false, error: 'No outstanding balance to pay.' };

    try {
      const placeholder = `pending_${customerId}_${Date.now()}`;
      const payment = await this.db.payment.create({
        data: {
          customerId,
          adminUserId: owner.id,
          amount: snapshot.total,
          currency: 'usd',
          status: 'pending',
          stripeCheckoutSessionId: placeholder,
          snapshot: { consumptions: snapshot.consumptions, deposits: snapshot.deposits },
        },
      });

      const session = await this.client.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: 'Electricity bill payment' },
              unit_amount: Math.round(snapshot.total * 100),
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          transfer_data: { destination: owner.stripeConnectAccountId },
          metadata: { paymentId: payment.id, customerId },
        },
        metadata: { paymentId: payment.id, customerId },
        success_url: `${this.frontendUrl}/customers/${customerId}?payment=success`,
        cancel_url: `${this.frontendUrl}/customers/${customerId}?payment=cancel`,
      });

      await this.db.payment.update({ where: { id: payment.id }, data: { stripeCheckoutSessionId: session.id } });
      return { success: true, url: session.url! };
    } catch (e) {
      this.logger.error(`createCustomerPaymentCheckoutSession failed for customer ${customerId}`, e as Error);
      return { success: false, error: (e as Error).message };
    }
  }

  // ── Webhooks ──

  verifyWebhookSignature(rawBody: Buffer, signature: string): { success: true; event: Stripe.Event } | StripeFailure {
    if (!this.isWebhookConfigured()) return { success: false, error: 'Webhooks are not configured (missing STRIPE_WEBHOOK_SECRET).' };
    try {
      const event = this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret!);
      return { success: true, event };
    } catch (e) {
      this.logger.warn(`Webhook signature verification failed: ${(e as Error).message}`);
      return { success: false, error: (e as Error).message };
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionSync(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object);
        break;
      default:
        // Not one of the 5 event types this app subscribes to — no-op, 200 OK.
        break;
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.mode === 'subscription') {
      const adminUserId = session.metadata?.adminUserId;
      if (!adminUserId || typeof session.subscription !== 'string') {
        this.logger.warn(`checkout.session.completed (subscription) missing adminUserId/subscription id: session ${session.id}`);
        return;
      }
      const sub = await this.client.subscriptions.retrieve(session.subscription);
      await this.applySubscriptionState(adminUserId, sub);
      return;
    }

    if (session.mode === 'payment') {
      const paymentId = session.metadata?.paymentId;
      if (!paymentId) {
        this.logger.warn(`checkout.session.completed (payment) missing paymentId metadata: session ${session.id}`);
        return;
      }
      await this.billingService.applyPaymentSnapshot(paymentId, typeof session.payment_intent === 'string' ? session.payment_intent : undefined);
    }
  }

  private async applySubscriptionState(adminUserId: string, sub: Stripe.Subscription): Promise<void> {
    const periodEnd = sub.items.data[0]?.current_period_end;
    await this.db.user.update({
      where: { id: adminUserId },
      data: {
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status,
        subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });
  }

  private async handleSubscriptionSync(sub: Stripe.Subscription): Promise<void> {
    const user = await this.db.user.findUnique({ where: { stripeSubscriptionId: sub.id } });
    if (!user) {
      this.logger.warn(`No user found for stripeSubscriptionId ${sub.id}`);
      return;
    }
    await this.applySubscriptionState(user.id, sub);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription;
    const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId?.id;
    if (!subId) return;
    const user = await this.db.user.findUnique({ where: { stripeSubscriptionId: subId } });
    if (!user) return;
    await this.db.user.update({ where: { id: user.id }, data: { subscriptionStatus: 'past_due' } });
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const user = await this.db.user.findUnique({ where: { stripeConnectAccountId: account.id } });
    if (!user) {
      this.logger.warn(`No user found for stripeConnectAccountId ${account.id}`);
      return;
    }
    await this.db.user.update({ where: { id: user.id }, data: { stripeConnectOnboarded: account.charges_enabled === true } });
  }
}
