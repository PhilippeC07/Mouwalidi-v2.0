import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateMonthlyBillingDto, CustomerTypeSummaryDto, MonthlyCustomerEntryDto, MonthlySummaryDto, RegionSummaryLineDto, UpdateMonthlyConsumptionDto } from './dto/billing.dto.js';

@Injectable()
export class BillingService {
  constructor(private readonly db: PrismaService) {}

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

    // Find the most appropriate initial ConsumptionStatus for new bills
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

    // Get all matching customers (consumptionType.isCounter must match)
    const customers = await this.db.customer.findMany({
      where: {
        consumptionType: {
          generatorGroupId: dto.generatorGroupId,
          isCounter: dto.isCounter,
        },
      },
      select: {
        id: true,
        consumptionTypeId: true,
        consumptionType: { select: { Ampere: true } },
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

    // Generate a MonthlyConsumption record per customer
    const consumptions = await this.db.$transaction(
      customers.map((customer) => {
        const previousCounter = customer.monthlyConsumptions[0]?.currentCounter ?? 0;
        const monthlyFee = dto.isCounter
          ? 0
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

  async updateMonthlyConsumption(id: string, dto: UpdateMonthlyConsumptionDto) {
    return this.db.monthlyConsumption.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        date: true,
        previousCounter: true,
        currentCounter: true,
        monthlyFee: true,
        amountPaid: true,
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

  private calcBalance(c: { isCounter: boolean; previousCounter: number; currentCounter: number; kwhPrice: number; monthlyFee: number }) {
    return c.isCounter ? (c.currentCounter - c.previousCounter) * c.kwhPrice + c.monthlyFee : c.monthlyFee;
  }

  private async fetchMonthConsumptions(month: string) {
    return this.db.monthlyConsumption.findMany({
      where: { date: this.monthBounds(month) },
      select: {
        id: true,
        previousCounter: true,
        currentCounter: true,
        monthlyFee: true,
        amountPaid: true,
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
      const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee });
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
      const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee });
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
      const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee });
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
        const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee });
        const remaining = balance - c.amountPaid;
        return { consumptionId: c.id, customerId: c.customer.id, customerName: [c.customer.firstName, c.customer.middleName, c.customer.lastName].filter(Boolean).join(' '), groupName: c.customer.consumptionType.generatorGroup?.name ?? '', regionName: c.customer.consumptionType.generatorGroup?.region?.name ?? '', balance, amountPaid: c.amountPaid, remaining, status: c.consumptionStatus.Status, closedBalance: c.closedBalance };
      })
      .filter((e) => !e.closedBalance && e.remaining > 0.001)
      .sort((a, b) => b.remaining - a.remaining);
  }

  async getMonthlyPayments(month: string): Promise<MonthlyCustomerEntryDto[]> {
    const consumptions = await this.fetchMonthConsumptions(month);
    return consumptions
      .map((c) => {
        const balance = this.calcBalance({ isCounter: c.customer.isCounter, previousCounter: c.previousCounter, currentCounter: c.currentCounter, kwhPrice: c.kwhPrice, monthlyFee: c.monthlyFee });
        const remaining = balance - c.amountPaid;
        return { consumptionId: c.id, customerId: c.customer.id, customerName: [c.customer.firstName, c.customer.middleName, c.customer.lastName].filter(Boolean).join(' '), groupName: c.customer.consumptionType.generatorGroup?.name ?? '', regionName: c.customer.consumptionType.generatorGroup?.region?.name ?? '', balance, amountPaid: c.amountPaid, remaining, status: c.consumptionStatus.Status, closedBalance: c.closedBalance };
      })
      .filter((e) => e.amountPaid > 0)
      .sort((a, b) => b.amountPaid - a.amountPaid);
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
