import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CounterUpdateItemDto, CreateMonthlyBillingDto, CreateSingleBillingDto, CustomerBalanceDto, CustomerTypeSummaryDto, MonthlyCounterEntryDto, MonthlyCustomerEntryDto, MonthlySummaryDto, ReceiptDto, RegionSummaryLineDto, UpdateMonthlyConsumptionDto } from './dto/billing.dto.js';

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

  async createMonthlyBilling(dto: CreateMonthlyBillingDto) {
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
  async getCustomerMonthlyRate(customerId: string, month: string) {
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
  async createSingleBilling(customerId: string, dto: CreateSingleBillingDto) {
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

  async updateMonthlyConsumption(id: string, dto: UpdateMonthlyConsumptionDto) {
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

  private calcBalance(c: { isCounter: boolean; previousCounter: number; currentCounter: number; kwhPrice: number; monthlyFee: number; balanceOverride?: number | null }) {
    if (c.balanceOverride != null) return c.balanceOverride;
    return c.isCounter ? (c.currentCounter - c.previousCounter) * c.kwhPrice + c.monthlyFee : c.monthlyFee;
  }

  private async fetchMonthConsumptions(month: string, generatorGroupId?: string) {
    return this.db.monthlyConsumption.findMany({
      where: {
        date: this.monthBounds(month),
        ...(generatorGroupId ? { customer: { consumptionType: { generatorGroupId } } } : {}),
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

  async getMonthlySummary(month: string): Promise<MonthlySummaryDto> {
    const consumptions = await this.fetchMonthConsumptions(month);

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

  async getMonthlyReceivables(month: string): Promise<MonthlyCustomerEntryDto[]> {
    const consumptions = await this.fetchMonthConsumptions(month);
    return consumptions
      .map((c) => {
        const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee, balanceOverride: c.balanceOverride });
        const remaining = balance - c.amountPaid;
        return { consumptionId: c.id, customerId: c.customer.id, customerName: [c.customer.firstName, c.customer.middleName, c.customer.lastName].filter(Boolean).join(' '), groupName: c.customer.consumptionType.generatorGroup?.name ?? '', regionName: c.customer.consumptionType.generatorGroup?.region?.name ?? '', balance, amountPaid: c.amountPaid, remaining, status: c.consumptionStatus.Status, closedBalance: c.closedBalance, paidDate: c.paidDate ? c.paidDate.toISOString() : null };
      })
      .filter((e) => !e.closedBalance && e.remaining > 0.001)
      .sort((a, b) => b.remaining - a.remaining);
  }

  async getMonthlyPayments(month: string): Promise<MonthlyCustomerEntryDto[]> {
    const consumptions = await this.fetchMonthConsumptions(month);
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

  async getMonthlyCustomerBalances(month: string, generatorGroupId: string): Promise<CustomerBalanceDto[]> {
    const consumptions = await this.fetchMonthConsumptions(month, generatorGroupId);
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

  async getMonthlyCounterEntries(month: string, generatorGroupId: string): Promise<MonthlyCounterEntryDto[]> {
    const consumptions = await this.fetchMonthConsumptions(month, generatorGroupId);
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

  async bulkUpdateCounters(updates: CounterUpdateItemDto[]) {
    if (updates.length === 0) return { updated: 0 };
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

  async getReceipts(customerIds: string[], months: string[]): Promise<ReceiptDto[]> {
    if (customerIds.length === 0 || months.length === 0) return [];
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

  async getMonthlyBillings(generatorGroupId: string, isCounter: boolean) {
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
