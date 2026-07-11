import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CounterUpdateItemDto, CreateMonthlyBillingDto, CreateSingleBillingDto, CustomerAllTimeBalanceDto, CustomerBalanceDto, CustomerTypeSummaryDto, MonthlyCounterEntryDto, MonthlyCustomerEntryDto, MonthlySummaryDto, ReceiptDto, RegionBillingSummaryDto, RegionGroupBillingLineDto, RegionSummaryLineDto, UpdateMonthlyConsumptionDto } from './dto/billing.dto.js';
import {
  assertCustomerOwned,
  assertCustomersOwned,
  assertGeneratorGroupOwned,
  assertMonthlyConsumptionsOwned,
  assertRegionOwned,
  isSuperAdmin,
  ownerScope,
  type RequestingUser,
} from '../auth/ownership.util.js';
import { Role } from '../generated/prisma/client.js';

@Injectable()
export class BillingService {
  constructor(private readonly db: PrismaService) {}

  // Find the most appropriate initial ConsumptionStatus for new bills
  private async getDefaultStatus() {
    const defaultStatus =
      (await this.db.consumptionStatus.findFirst({
        where: {
          OR: [
            { Status: { contains: 'unpaid', mode: 'insensitive' } },
            { Status: { contains: 'pending', mode: 'insensitive' } },
            { Status: { contains: 'due', mode: 'insensitive' } },
          ],
        },
      })) ?? (await this.db.consumptionStatus.findFirst());

    if (!defaultStatus) throw new BadRequestException('No ConsumptionStatus records found in the database.');
    return defaultStatus;
  }

  async createMonthlyBilling(dto: CreateMonthlyBillingDto, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, dto.generatorGroupId);
    const date = new Date(`${dto.month}-01T00:00:00.000Z`);

    // Prevent duplicate: same group + month + type
    const existing = await this.db.monthlyPrice.findFirst({
      where: {
        generatorGroupId: dto.generatorGroupId,
        isCounter: dto.isCounter,
        date,
      },
    });
    if (existing) {
      throw new BadRequestException(
        `A ${dto.isCounter ? 'counter' : 'fixed'} billing entry already exists for this group and month.`,
      );
    }

    const defaultStatus = await this.getDefaultStatus();

    // Create the MonthlyPrice record
    const monthlyPrice = await this.db.monthlyPrice.create({
      data: {
        generatorGroupId: dto.generatorGroupId,
        date,
        kwhPrice: dto.isCounter ? dto.price : 0,
        FixedPricePerAmp: dto.isCounter ? 0 : dto.price,
        isCounter: dto.isCounter,
      },
    });

    // Get all matching customers (consumptionType.isCounter must match).
    // Inactive customers are excluded — no new bills should be generated for them.
    const customers = await this.db.customer.findMany({
      where: {
        consumptionType: {
          generatorGroupId: dto.generatorGroupId,
          isCounter: dto.isCounter,
        },
        status: { equals: 'active', mode: 'insensitive' },
      },
      select: {
        id: true,
        consumptionTypeId: true,
        consumptionType: { select: { Ampere: true, monthlyFee: true } },
        monthlyConsumptions: {
          select: { currentCounter: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    if (customers.length === 0) {
      return { monthlyPriceId: monthlyPrice.id, consumptionsCreated: 0 };
    }

    // Generate a MonthlyConsumption record per customer.
    // Counter (metered) customers still carry a flat monthly subscription fee —
    // it comes from their subscription type, not from the per-kWh billing rate.
    const consumptions = await this.db.$transaction(
      customers.map((customer) => {
        const previousCounter = customer.monthlyConsumptions[0]?.currentCounter ?? 0;
        const monthlyFee = dto.isCounter
          ? customer.consumptionType.monthlyFee
          : customer.consumptionType.Ampere * dto.price;

        return this.db.monthlyConsumption.create({
          data: {
            customerId: customer.id,
            previousCounter,
            currentCounter: previousCounter,
            monthlyFee,
            amountPaid: 0,
            kwhPrice: dto.isCounter ? dto.price : 0,
            isCut: false,
            consumptionStatusId: defaultStatus.id,
            closedBalance: false,
            date,
            monthlyPriceId: monthlyPrice.id,
            consumptionTypeId: customer.consumptionTypeId,
          },
        });
      }),
    );

    return {
      monthlyPriceId: monthlyPrice.id,
      consumptionsCreated: consumptions.length,
    };
  }

  /** Whether a billing rate already exists for this customer's group/type for the given month. */
  async getCustomerMonthlyRate(customerId: string, month: string, user: RequestingUser) {
    await assertCustomerOwned(this.db, user, customerId);
    const date = new Date(`${month}-01T00:00:00.000Z`);

    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
      select: { isCounter: true, consumptionType: { select: { generatorGroupId: true } } },
    });
    if (!customer) throw new BadRequestException('Customer not found.');

    const monthlyPrice = await this.db.monthlyPrice.findFirst({
      where: {
        generatorGroupId: customer.consumptionType.generatorGroupId,
        isCounter: customer.isCounter,
        date,
      },
    });

    if (!monthlyPrice) return { exists: false, price: null };
    return { exists: true, price: customer.isCounter ? monthlyPrice.kwhPrice : monthlyPrice.FixedPricePerAmp };
  }

  /** Adds a single missing bill for one customer — e.g. a month a bulk billing run skipped them. */
  async createSingleBilling(customerId: string, dto: CreateSingleBillingDto, user: RequestingUser) {
    await assertCustomerOwned(this.db, user, customerId);
    const date = new Date(`${dto.month}-01T00:00:00.000Z`);

    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        isCounter: true,
        consumptionTypeId: true,
        consumptionType: { select: { generatorGroupId: true, Ampere: true, monthlyFee: true } },
        monthlyConsumptions: {
          where: { date: { lt: date } },
          select: { currentCounter: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });
    if (!customer) throw new BadRequestException('Customer not found.');

    const existingForMonth = await this.db.monthlyConsumption.findFirst({
      where: { customerId, date },
    });
    if (existingForMonth) {
      throw new BadRequestException('This customer already has a bill for that month.');
    }

    let monthlyPrice = await this.db.monthlyPrice.findFirst({
      where: {
        generatorGroupId: customer.consumptionType.generatorGroupId,
        isCounter: customer.isCounter,
        date,
      },
    });

    if (!monthlyPrice) {
      if (dto.price === undefined) {
        throw new BadRequestException('No billing rate exists yet for this month — please provide a price.');
      }
      monthlyPrice = await this.db.monthlyPrice.create({
        data: {
          generatorGroupId: customer.consumptionType.generatorGroupId,
          date,
          kwhPrice: customer.isCounter ? dto.price : 0,
          FixedPricePerAmp: customer.isCounter ? 0 : dto.price,
          isCounter: customer.isCounter,
        },
      });
    }

    const price = customer.isCounter ? monthlyPrice.kwhPrice : monthlyPrice.FixedPricePerAmp;
    const previousCounter = customer.monthlyConsumptions[0]?.currentCounter ?? 0;
    const monthlyFee = customer.isCounter ? customer.consumptionType.monthlyFee : customer.consumptionType.Ampere * price;
    const defaultStatus = await this.getDefaultStatus();

    return this.db.monthlyConsumption.create({
      data: {
        customerId,
        previousCounter,
        currentCounter: previousCounter,
        monthlyFee,
        amountPaid: 0,
        kwhPrice: customer.isCounter ? price : 0,
        isCut: false,
        consumptionStatusId: defaultStatus.id,
        closedBalance: false,
        date,
        monthlyPriceId: monthlyPrice.id,
        consumptionTypeId: customer.consumptionTypeId,
      },
      select: {
        id: true,
        date: true,
        previousCounter: true,
        currentCounter: true,
        monthlyFee: true,
        balanceOverride: true,
        amountPaid: true,
        paidDate: true,
        kwhPrice: true,
        isCut: true,
        closedBalance: true,
        consumptionStatusId: true,
        consumptionStatus: { select: { Status: true } },
      },
    });
  }

  async updateMonthlyConsumption(id: string, dto: UpdateMonthlyConsumptionDto, user: RequestingUser) {
    await assertMonthlyConsumptionsOwned(this.db, user, [id]);
    const { paidDate, ...rest } = dto;

    // Track when a payment was made: use the explicit date if given, otherwise
    // default to today whenever an amount is recorded, and clear it if the
    // amount is reset to zero.
    let paidDateValue: Date | null | undefined;
    if (paidDate !== undefined) {
      paidDateValue = paidDate ? new Date(paidDate) : null;
    } else if (dto.amountPaid !== undefined) {
      paidDateValue = dto.amountPaid > 0 ? new Date() : null;
    }

    return this.db.monthlyConsumption.update({
      where: { id },
      data: { ...rest, ...(paidDateValue !== undefined ? { paidDate: paidDateValue } : {}) },
      select: {
        id: true,
        date: true,
        previousCounter: true,
        currentCounter: true,
        monthlyFee: true,
        balanceOverride: true,
        amountPaid: true,
        paidDate: true,
        kwhPrice: true,
        isCut: true,
        closedBalance: true,
        consumptionStatusId: true,
        consumptionStatus: { select: { Status: true } },
      },
    });
  }

  /* ── Accounting helpers ── */

  private monthBounds(month: string) {
    const [y, m] = month.split('-').map(Number);
    return { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  }

  /** The last `n` calendar months (YYYY-MM), ending with the current month. */
  private lastNMonths(n: number): string[] {
    const now = new Date();
    const months: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }

  private calcBalance(c: { isCounter: boolean; previousCounter: number; currentCounter: number; kwhPrice: number; monthlyFee: number; balanceOverride?: number | null }) {
    if (c.balanceOverride != null) return c.balanceOverride;
    return c.isCounter ? (c.currentCounter - c.previousCounter) * c.kwhPrice + c.monthlyFee : c.monthlyFee;
  }

  private async fetchMonthConsumptions(month: string, user: RequestingUser, generatorGroupId?: string) {
    return this.db.monthlyConsumption.findMany({
      where: {
        date: this.monthBounds(month),
        customer: {
          consumptionType: {
            ...(generatorGroupId ? { generatorGroupId } : {}),
            generatorGroup: { region: { ...ownerScope(user) } },
          },
        },
      },
      select: {
        id: true,
        previousCounter: true,
        currentCounter: true,
        monthlyFee: true,
        balanceOverride: true,
        amountPaid: true,
        paidDate: true,
        kwhPrice: true,
        closedBalance: true,
        consumptionStatus: { select: { Status: true } },
        customer: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            isCounter: true,
            consumptionType: {
              select: {
                generatorGroup: {
                  select: { id: true, name: true, region: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  async getMonthlySummary(month: string, user: RequestingUser): Promise<MonthlySummaryDto> {
    const consumptions = await this.fetchMonthConsumptions(month, user);

    const groupMap = new Map<string, { groupName: string; regionName: string; totalBilled: number; totalPaid: number; outstanding: number; customerCount: number }>();

    for (const c of consumptions) {
      const grp = c.customer.consumptionType.generatorGroup;
      if (!grp) continue;
      const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee, balanceOverride: c.balanceOverride });
      const remaining = balance - c.amountPaid;
      if (!groupMap.has(grp.id)) groupMap.set(grp.id, { groupName: grp.name, regionName: grp.region?.name ?? '', totalBilled: 0, totalPaid: 0, outstanding: 0, customerCount: 0 });
      const g = groupMap.get(grp.id)!;
      g.totalBilled += balance;
      g.totalPaid += c.amountPaid;
      if (!c.closedBalance) g.outstanding += remaining;
      g.customerCount++;
    }

    const byGroup = Array.from(groupMap.entries()).map(([groupId, g]) => ({
      groupId,
      groupName: g.groupName,
      regionName: g.regionName,
      totalBilled: g.totalBilled,
      totalPaid: g.totalPaid,
      outstanding: g.outstanding,
      customerCount: g.customerCount,
      collectionRate: g.totalBilled > 0 ? (g.totalPaid / g.totalBilled) * 100 : 100,
    }));

    const regionMap = new Map<string, { regionName: string; totalBilled: number; totalPaid: number; outstanding: number; customerCount: number }>();
    for (const c of consumptions) {
      const region = c.customer.consumptionType.generatorGroup?.region;
      if (!region) continue;
      const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee, balanceOverride: c.balanceOverride });
      const remaining = balance - c.amountPaid;
      if (!regionMap.has(region.id)) regionMap.set(region.id, { regionName: region.name, totalBilled: 0, totalPaid: 0, outstanding: 0, customerCount: 0 });
      const r = regionMap.get(region.id)!;
      r.totalBilled += balance;
      r.totalPaid += c.amountPaid;
      if (!c.closedBalance) r.outstanding += remaining;
      r.customerCount++;
    }
    const byRegion: RegionSummaryLineDto[] = Array.from(regionMap.entries()).map(([regionId, r]) => ({
      regionId,
      regionName: r.regionName,
      totalBilled: r.totalBilled,
      totalPaid: r.totalPaid,
      outstanding: r.outstanding,
      customerCount: r.customerCount,
      collectionRate: r.totalBilled > 0 ? (r.totalPaid / r.totalBilled) * 100 : 100,
    }));

    const totalBilled = byGroup.reduce((s, g) => s + g.totalBilled, 0);
    const totalPaid = byGroup.reduce((s, g) => s + g.totalPaid, 0);
    const outstanding = byGroup.reduce((s, g) => s + g.outstanding, 0);

    const blank = (): CustomerTypeSummaryDto => ({ customerCount: 0, totalBilled: 0, totalPaid: 0, outstanding: 0 });
    const counter = blank();
    const fixed = blank();

    for (const c of consumptions) {
      const bucket = c.customer.isCounter ? counter : fixed;
      const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee, balanceOverride: c.balanceOverride });
      const remaining = balance - c.amountPaid;
      bucket.customerCount++;
      bucket.totalBilled += balance;
      bucket.totalPaid += c.amountPaid;
      if (!c.closedBalance) bucket.outstanding += remaining;
    }

    return { month, totalBilled, totalPaid, outstanding, collectionRate: totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 100, counter, fixed, byGroup, byRegion };
  }

  async getMonthlyReceivables(month: string, user: RequestingUser): Promise<MonthlyCustomerEntryDto[]> {
    const consumptions = await this.fetchMonthConsumptions(month, user);
    return consumptions
      .map((c) => {
        const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee, balanceOverride: c.balanceOverride });
        const remaining = balance - c.amountPaid;
        return { consumptionId: c.id, customerId: c.customer.id, customerName: [c.customer.firstName, c.customer.middleName, c.customer.lastName].filter(Boolean).join(' '), groupName: c.customer.consumptionType.generatorGroup?.name ?? '', regionName: c.customer.consumptionType.generatorGroup?.region?.name ?? '', balance, amountPaid: c.amountPaid, remaining, status: c.consumptionStatus.Status, closedBalance: c.closedBalance, paidDate: c.paidDate ? c.paidDate.toISOString() : null };
      })
      .filter((e) => !e.closedBalance && e.remaining > 0.001)
      .sort((a, b) => b.remaining - a.remaining);
  }

  async getMonthlyPayments(month: string, user: RequestingUser): Promise<MonthlyCustomerEntryDto[]> {
    const consumptions = await this.fetchMonthConsumptions(month, user);
    return consumptions
      .map((c) => {
        const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee, balanceOverride: c.balanceOverride });
        const remaining = balance - c.amountPaid;
        return { consumptionId: c.id, customerId: c.customer.id, customerName: [c.customer.firstName, c.customer.middleName, c.customer.lastName].filter(Boolean).join(' '), groupName: c.customer.consumptionType.generatorGroup?.name ?? '', regionName: c.customer.consumptionType.generatorGroup?.region?.name ?? '', balance, amountPaid: c.amountPaid, remaining, status: c.consumptionStatus.Status, closedBalance: c.closedBalance, paidDate: c.paidDate ? c.paidDate.toISOString() : null };
      })
      .filter((e) => e.amountPaid > 0)
      .sort((a, b) => {
        if (!a.paidDate && !b.paidDate) return b.amountPaid - a.amountPaid;
        if (!a.paidDate) return 1;
        if (!b.paidDate) return -1;
        return a.paidDate.localeCompare(b.paidDate);
      });
  }

  async getMonthlyCustomerBalances(month: string, generatorGroupId: string, user: RequestingUser): Promise<CustomerBalanceDto[]> {
    await assertGeneratorGroupOwned(this.db, user, generatorGroupId);
    const consumptions = await this.fetchMonthConsumptions(month, user, generatorGroupId);
    return consumptions.map((c) => {
      const balance = this.calcBalance({
        isCounter: c.customer.isCounter,
        previousCounter: c.previousCounter,
        currentCounter: c.currentCounter,
        kwhPrice: c.kwhPrice,
        monthlyFee: c.monthlyFee,
        balanceOverride: c.balanceOverride,
      });
      return {
        customerId: c.customer.id,
        consumptionId: c.id,
        balance,
        amountPaid: c.amountPaid,
        remaining: balance - c.amountPaid,
        closedBalance: c.closedBalance,
      };
    });
  }

  /**
   * Each customer's total unpaid amount across ALL their bills and deposits —
   * not scoped to a single month. Used for group-level "Outstanding" /
   * "Remaining" / payment-alert KPIs, which would otherwise go blank for any
   * month that group hasn't been billed for yet even though customers may
   * still owe money from other months.
   */
  async getGroupCustomerAllTimeBalances(generatorGroupId: string, user: RequestingUser): Promise<CustomerAllTimeBalanceDto[]> {
    await assertGeneratorGroupOwned(this.db, user, generatorGroupId);
    const [consumptions, deposits] = await Promise.all([
      this.db.monthlyConsumption.findMany({
        where: { customer: { consumptionType: { generatorGroupId } } },
        select: {
          customerId: true,
          previousCounter: true,
          currentCounter: true,
          monthlyFee: true,
          balanceOverride: true,
          amountPaid: true,
          kwhPrice: true,
          closedBalance: true,
          customer: { select: { isCounter: true } },
        },
      }),
      this.db.deposit.findMany({
        where: { customer: { consumptionType: { generatorGroupId } } },
        select: { customerId: true, amount: true, paidAmount: true },
      }),
    ]);

    // Every customer with at least one bill or deposit gets an entry — even
    // if it sums to exactly 0 — so a fully-paid-up customer renders as a
    // clear "$0.00" rather than a "no data" dash, which is reserved for
    // customers who have never been billed at all.
    const byCustomer = new Map<string, number>();

    for (const c of consumptions) {
      if (!byCustomer.has(c.customerId)) byCustomer.set(c.customerId, 0);
      if (c.closedBalance) continue;
      const balance = this.calcBalance({
        isCounter: c.customer.isCounter,
        previousCounter: c.previousCounter,
        currentCounter: c.currentCounter,
        kwhPrice: c.kwhPrice,
        monthlyFee: c.monthlyFee,
        balanceOverride: c.balanceOverride,
      });
      const remaining = balance - c.amountPaid;
      if (remaining > 0.001) {
        byCustomer.set(c.customerId, byCustomer.get(c.customerId)! + remaining);
      }
    }

    for (const d of deposits) {
      if (!byCustomer.has(d.customerId)) byCustomer.set(d.customerId, 0);
      const remaining = d.amount - d.paidAmount;
      if (remaining > 0.001) {
        byCustomer.set(d.customerId, byCustomer.get(d.customerId)! + remaining);
      }
    }

    return Array.from(byCustomer.entries()).map(([customerId, remaining]) => ({ customerId, remaining }));
  }

  /**
   * Same calc/filter logic as getGroupCustomerAllTimeBalances, scoped to a
   * single customer, with the individual row ids included — used to snapshot
   * exactly what's being paid for at Stripe Checkout-session-creation time.
   * Deliberately NOT ownership-scoped here (no assertCustomerOwned) — this is
   * an internal cross-service helper; callers are responsible for only ever
   * passing a customer id the caller is actually allowed to act on.
   */
  async getCustomerOutstandingSnapshot(customerId: string): Promise<{
    total: number;
    consumptions: { id: string; remaining: number }[];
    deposits: { id: string; remaining: number }[];
  }> {
    const [consumptions, deposits] = await Promise.all([
      this.db.monthlyConsumption.findMany({
        where: { customerId, closedBalance: false },
        select: {
          id: true,
          previousCounter: true,
          currentCounter: true,
          monthlyFee: true,
          balanceOverride: true,
          amountPaid: true,
          kwhPrice: true,
          customer: { select: { isCounter: true } },
        },
      }),
      this.db.deposit.findMany({
        where: { customerId },
        select: { id: true, amount: true, paidAmount: true },
      }),
    ]);

    const consumptionRows: { id: string; remaining: number }[] = [];
    for (const c of consumptions) {
      const balance = this.calcBalance({
        isCounter: c.customer.isCounter,
        previousCounter: c.previousCounter,
        currentCounter: c.currentCounter,
        kwhPrice: c.kwhPrice,
        monthlyFee: c.monthlyFee,
        balanceOverride: c.balanceOverride,
      });
      const remaining = balance - c.amountPaid;
      if (remaining > 0.001) consumptionRows.push({ id: c.id, remaining });
    }

    const depositRows: { id: string; remaining: number }[] = [];
    for (const d of deposits) {
      const remaining = d.amount - d.paidAmount;
      if (remaining > 0.001) depositRows.push({ id: d.id, remaining });
    }

    const total =
      consumptionRows.reduce((s, r) => s + r.remaining, 0) +
      depositRows.reduce((s, r) => s + r.remaining, 0);

    return { total, consumptions: consumptionRows, deposits: depositRows };
  }

  /** Applies a settled bill payment to exactly the rows snapshotted at checkout-creation time — idempotent (short-circuits if already succeeded) and capped against each row's current remaining (in case something changed since the snapshot). Shared by the Stripe webhook handler and the Whish manual-approval route. */
  async applyPaymentSnapshot(paymentId: string, stripePaymentIntentId?: string): Promise<void> {
    const payment = await this.db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;
    if (payment.status === 'succeeded') return;

    const snapshot = payment.snapshot as { consumptions: { id: string; remaining: number }[]; deposits: { id: string; remaining: number }[] };

    await this.db.$transaction(async (tx) => {
      for (const row of snapshot.consumptions) {
        const current = await this.getConsumptionRemaining(row.id);
        if (!current) continue;
        const applyAmount = Math.min(row.remaining, Math.max(0, current.remaining));
        if (applyAmount <= 0) continue;
        await tx.monthlyConsumption.update({
          where: { id: row.id },
          data: {
            amountPaid: { increment: applyAmount },
            paidDate: new Date(),
            closedBalance: current.remaining - applyAmount <= 0.001,
          },
        });
      }

      for (const row of snapshot.deposits) {
        const deposit = await tx.deposit.findUnique({ where: { id: row.id }, select: { amount: true, paidAmount: true } });
        if (!deposit) continue;
        const currentRemaining = deposit.amount - deposit.paidAmount;
        const applyAmount = Math.min(row.remaining, Math.max(0, currentRemaining));
        if (applyAmount <= 0) continue;
        await tx.deposit.update({
          where: { id: row.id },
          data: { paidAmount: { increment: applyAmount }, paidDate: new Date() },
        });
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'succeeded', paidAt: new Date(), ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}) },
      });
    });
  }

  /** Platform subscription price per customer/month (ADMIN -> SUPERADMIN billing) — shared by the Stripe and Whish payment paths so both always quote the same amount. */
  get pricePerCustomerUsd(): number {
    return Number(process.env.SUBSCRIPTION_PRICE_PER_CUSTOMER_USD ?? 0.5);
  }

  /** Total customers across all of an admin's regions — the unit the platform subscription is billed against. Not status-filtered: every Customer row tied to the admin's regions counts. */
  async getAdminCustomerCount(adminUserId: string): Promise<number> {
    return this.db.customer.count({
      where: { consumptionType: { generatorGroup: { region: { ownerId: adminUserId } } } },
    });
  }

  async getAdminSubscriptionPricing(adminUserId: string): Promise<{ customerCount: number; pricePerCustomerUsd: number; amountUsd: number }> {
    const customerCount = await this.getAdminCustomerCount(adminUserId);
    const amountUsd = Math.round(customerCount * this.pricePerCustomerUsd * 100) / 100;
    return { customerCount, pricePerCustomerUsd: this.pricePerCustomerUsd, amountUsd };
  }

  /** Recomputes one MonthlyConsumption row's current remaining balance — used by the Stripe webhook handler to defensively cap a payment against what's actually still owed at settlement time (which may have shifted since the payment's snapshot was taken). */
  async getConsumptionRemaining(id: string): Promise<{ remaining: number } | null> {
    const c = await this.db.monthlyConsumption.findUnique({
      where: { id },
      select: {
        amountPaid: true,
        previousCounter: true,
        currentCounter: true,
        kwhPrice: true,
        monthlyFee: true,
        balanceOverride: true,
        customer: { select: { isCounter: true } },
      },
    });
    if (!c) return null;
    const balance = this.calcBalance({
      isCounter: c.customer.isCounter,
      previousCounter: c.previousCounter,
      currentCounter: c.currentCounter,
      kwhPrice: c.kwhPrice,
      monthlyFee: c.monthlyFee,
      balanceOverride: c.balanceOverride,
    });
    return { remaining: balance - c.amountPaid };
  }

  /**
   * All-time billing totals for a region (across all its generator groups),
   * plus a per-group breakdown and a last-6-month trend for charting. Uses
   * the same all-time approach as getGroupCustomerAllTimeBalances rather than
   * a single-month snapshot, so a region isn't billed for the current
   * calendar month yet doesn't read as "no activity".
   */
  async getRegionBillingSummary(regionId: string, user: RequestingUser): Promise<RegionBillingSummaryDto> {
    await assertRegionOwned(this.db, user, regionId);
    const [consumptions, deposits] = await Promise.all([
      this.db.monthlyConsumption.findMany({
        where: { customer: { consumptionType: { generatorGroup: { regionId } } } },
        select: {
          date: true,
          previousCounter: true,
          currentCounter: true,
          monthlyFee: true,
          balanceOverride: true,
          amountPaid: true,
          kwhPrice: true,
          closedBalance: true,
          customer: {
            select: {
              id: true,
              isCounter: true,
              consumptionType: { select: { generatorGroup: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
      this.db.deposit.findMany({
        where: { customer: { consumptionType: { generatorGroup: { regionId } } } },
        select: {
          amount: true,
          paidAmount: true,
          customer: {
            select: {
              id: true,
              consumptionType: { select: { generatorGroup: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
    ]);

    type GroupAcc = { groupName: string; totalBilled: number; totalPaid: number; outstanding: number; customerIds: Set<string> };
    const byGroupMap = new Map<string, GroupAcc>();
    const trendMap = new Map<string, { billed: number; paid: number }>();
    let totalBilled = 0;
    let totalPaid = 0;
    let outstanding = 0;

    const ensureGroup = (id: string, name: string): GroupAcc => {
      if (!byGroupMap.has(id)) byGroupMap.set(id, { groupName: name, totalBilled: 0, totalPaid: 0, outstanding: 0, customerIds: new Set() });
      return byGroupMap.get(id)!;
    };

    for (const c of consumptions) {
      const grp = c.customer.consumptionType.generatorGroup;
      if (!grp) continue;
      const balance = this.calcBalance({
        isCounter: c.customer.isCounter,
        previousCounter: c.previousCounter,
        currentCounter: c.currentCounter,
        kwhPrice: c.kwhPrice,
        monthlyFee: c.monthlyFee,
        balanceOverride: c.balanceOverride,
      });

      const g = ensureGroup(grp.id, grp.name);
      g.totalBilled += balance;
      g.totalPaid += c.amountPaid;
      g.customerIds.add(c.customer.id);
      totalBilled += balance;
      totalPaid += c.amountPaid;

      if (!c.closedBalance) {
        const remaining = balance - c.amountPaid;
        if (remaining > 0.001) {
          outstanding += remaining;
          g.outstanding += remaining;
        }
      }

      const monthKey = c.date.toISOString().slice(0, 7);
      if (!trendMap.has(monthKey)) trendMap.set(monthKey, { billed: 0, paid: 0 });
      const t = trendMap.get(monthKey)!;
      t.billed += balance;
      t.paid += c.amountPaid;
    }

    for (const d of deposits) {
      const grp = d.customer.consumptionType.generatorGroup;
      if (!grp) continue;
      const remaining = d.amount - d.paidAmount;

      const g = ensureGroup(grp.id, grp.name);
      g.totalBilled += d.amount;
      g.totalPaid += d.paidAmount;
      g.customerIds.add(d.customer.id);
      totalBilled += d.amount;
      totalPaid += d.paidAmount;
      if (remaining > 0.001) {
        outstanding += remaining;
        g.outstanding += remaining;
      }
    }

    const byGroup: RegionGroupBillingLineDto[] = Array.from(byGroupMap.entries()).map(([groupId, g]) => ({
      groupId,
      groupName: g.groupName,
      customerCount: g.customerIds.size,
      totalBilled: g.totalBilled,
      totalPaid: g.totalPaid,
      outstanding: g.outstanding,
      collectionRate: g.totalBilled > 0 ? (g.totalPaid / g.totalBilled) * 100 : 100,
    }));

    const monthlyTrend = this.lastNMonths(6).map((month) => ({
      month,
      billed: trendMap.get(month)?.billed ?? 0,
      paid: trendMap.get(month)?.paid ?? 0,
    }));

    return {
      totalBilled,
      totalPaid,
      outstanding,
      collectionRate: totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 100,
      byGroup,
      monthlyTrend,
    };
  }

  async getMonthlyCounterEntries(month: string, generatorGroupId: string, user: RequestingUser): Promise<MonthlyCounterEntryDto[]> {
    await assertGeneratorGroupOwned(this.db, user, generatorGroupId);
    const consumptions = await this.fetchMonthConsumptions(month, user, generatorGroupId);
    return consumptions
      .filter((c) => c.customer.isCounter)
      .map((c) => ({
        consumptionId: c.id,
        customerId: c.customer.id,
        customerName: [c.customer.firstName, c.customer.middleName, c.customer.lastName].filter(Boolean).join(' '),
        groupName: c.customer.consumptionType.generatorGroup?.name ?? '',
        regionName: c.customer.consumptionType.generatorGroup?.region?.name ?? '',
        previousCounter: c.previousCounter,
        currentCounter: c.currentCounter,
        kwhPrice: c.kwhPrice,
        closedBalance: c.closedBalance,
      }))
      .sort((a, b) => a.customerName.localeCompare(b.customerName));
  }

  async bulkUpdateCounters(updates: CounterUpdateItemDto[], user: RequestingUser) {
    if (updates.length === 0) return { updated: 0 };
    await assertMonthlyConsumptionsOwned(this.db, user, updates.map((u) => u.consumptionId));
    const results = await this.db.$transaction(
      updates.map((u) =>
        this.db.monthlyConsumption.update({
          where: { id: u.consumptionId },
          data: { currentCounter: u.currentCounter },
        }),
      ),
    );
    return { updated: results.length };
  }

  async getReceipts(customerIds: string[], months: string[], user: RequestingUser): Promise<ReceiptDto[]> {
    if (customerIds.length === 0 || months.length === 0) return [];

    if (user.role === Role.CUSTOMER) {
      if (customerIds.length !== 1 || customerIds[0] !== user.customerId) {
        throw new NotFoundException('One or more customers were not found.');
      }
    } else if (!isSuperAdmin(user)) {
      await assertCustomersOwned(this.db, user, customerIds);
    }

    const ranges = months.map((m) => this.monthBounds(m));

    const consumptions = await this.db.monthlyConsumption.findMany({
      where: {
        customerId: { in: customerIds },
        OR: ranges.map((date) => ({ date })),
      },
      select: {
        id: true,
        date: true,
        previousCounter: true,
        currentCounter: true,
        monthlyFee: true,
        balanceOverride: true,
        amountPaid: true,
        kwhPrice: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            isCounter: true,
            consumptionType: { select: { Ampere: true, ThreePhase: true } },
            buildingFloor: { select: { building: { select: { name: true } } } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    return consumptions.map((c) => {
      const balance = this.calcBalance({
        isCounter: c.customer.isCounter,
        previousCounter: c.previousCounter,
        currentCounter: c.currentCounter,
        kwhPrice: c.kwhPrice,
        monthlyFee: c.monthlyFee,
        balanceOverride: c.balanceOverride,
      });
      return {
        consumptionId: c.id,
        customerId: c.customer.id,
        customerName: [c.customer.firstName, c.customer.middleName, c.customer.lastName].filter(Boolean).join(' '),
        buildingName: c.customer.buildingFloor?.building.name ?? null,
        date: c.date.toISOString(),
        isCounter: c.customer.isCounter,
        ampere: c.customer.consumptionType.Ampere,
        threePhase: c.customer.consumptionType.ThreePhase,
        monthlyFee: c.monthlyFee,
        previousCounter: c.previousCounter,
        currentCounter: c.currentCounter,
        kwhPrice: c.kwhPrice,
        amountPaid: c.amountPaid,
        balance,
        remaining: balance - c.amountPaid,
      };
    });
  }

  async getMonthlyBillings(generatorGroupId: string, isCounter: boolean, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, generatorGroupId);
    const entries = await this.db.monthlyPrice.findMany({
      where: { generatorGroupId, isCounter },
      select: {
        id: true,
        date: true,
        kwhPrice: true,
        FixedPricePerAmp: true,
        isCounter: true,
        _count: { select: { monthlyConsumptions: true } },
      },
      orderBy: { date: 'desc' },
    });

    return entries.map((e) => ({
      id: e.id,
      date: e.date,
      price: e.isCounter ? e.kwhPrice : e.FixedPricePerAmp,
      isCounter: e.isCounter,
      billsCreated: e._count.monthlyConsumptions,
    }));
  }
}
