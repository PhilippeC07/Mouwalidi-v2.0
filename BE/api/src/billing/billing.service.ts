import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateMonthlyBillingDto, UpdateMonthlyConsumptionDto } from './dto/billing.dto.js';

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
