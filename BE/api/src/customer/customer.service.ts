import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import {
  ConsumptionStatusResponseDto,
  ConsumptionTypeResponseDto,
  CreateConsumptionTypeDto,
  CreateCustomerDto,
  CreateDepositDto,
  UpdateConsumptionTypeDto,
  UpdateCustomerDto,
  UpdateDepositDto,
} from './dto/customer.dto.js';

@Injectable()
export class CustomerService {
  constructor(private readonly db: PrismaService) {}

  async createCustomer(dto: CreateCustomerDto) {
    const { buildingId, floorNumber, apartmentSide, ...customerData } = dto;

    return this.db.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: customerData });
      await tx.buildingFloor.create({
        data: { floorNumber, apartmentSide, buildingId, customerId: customer.id },
      });
      return customer;
    });
  }

  async getConsumptionStatuses(): Promise<ConsumptionStatusResponseDto[]> {
    return this.db.consumptionStatus.findMany({
      select: { id: true, Status: true },
    });
  }

  async getConsumptionTypes(generatorGroupId: string): Promise<ConsumptionTypeResponseDto[]> {
    return this.db.consumptionType.findMany({
      where: { generatorGroupId },
      select: {
        id: true,
        description: true,
        Ampere: true,
        isCounter: true,
        ThreePhase: true,
        monthlyFee: true,
      },
    });
  }

  async createConsumptionType(dto: CreateConsumptionTypeDto) {
    return this.db.consumptionType.create({ data: dto });
  }

  async updateConsumptionType(id: string, dto: UpdateConsumptionTypeDto) {
    return this.db.consumptionType.update({ where: { id }, data: dto });
  }

  async deleteConsumptionType(id: string) {
    return this.db.consumptionType.delete({ where: { id } });
  }

  async deleteCustomer(id: string) {
    return this.db.$transaction(async (tx) => {
      await tx.monthlyConsumption.deleteMany({ where: { customerId: id } });
      await tx.deposit.deleteMany({ where: { customerId: id } });
      await tx.buildingFloor.deleteMany({ where: { customerId: id } });
      return tx.customer.delete({ where: { id } });
    });
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    const { buildingId, floorNumber, apartmentSide, ...customerData } = dto;

    return this.db.$transaction(async (tx) => {
      const customer = await tx.customer.update({ where: { id }, data: customerData });

      if (buildingId !== undefined && floorNumber !== undefined && apartmentSide !== undefined) {
        await tx.buildingFloor.upsert({
          where: { customerId: id },
          update: { floorNumber, apartmentSide, buildingId },
          create: { floorNumber, apartmentSide, buildingId, customerId: id },
        });
      }

      return customer;
    });
  }

  async getCustomerDetails(id: string) {
    return this.db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phoneNumber: true,
        status: true,
        isCounter: true,
        description: true,
        consumptionStatus: { select: { Status: true } },
        consumptionType: {
          select: { description: true, Ampere: true, isCounter: true, ThreePhase: true },
        },
        buildingFloor: {
          select: {
            floorNumber: true,
            apartmentSide: true,
            building: { select: { name: true } },
          },
        },
        monthlyConsumptions: {
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
          orderBy: { date: 'desc' },
        },
        deposits: {
          select: { id: true, amount: true, paidAmount: true, paidDate: true, date: true },
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  async createDeposit(customerId: string, dto: CreateDepositDto) {
    const paidAmount = dto.paidAmount ?? 0;
    return this.db.deposit.create({
      data: {
        customerId,
        amount: dto.amount,
        paidAmount,
        paidDate: paidAmount > 0 ? new Date() : null,
        date: new Date(`${dto.month}-01T00:00:00.000Z`),
      },
    });
  }

  async updateDeposit(id: string, dto: UpdateDepositDto) {
    const { paidDate, month, ...rest } = dto;

    let paidDateValue: Date | null | undefined;
    if (paidDate !== undefined) {
      paidDateValue = paidDate ? new Date(paidDate) : null;
    } else if (dto.paidAmount !== undefined) {
      paidDateValue = dto.paidAmount > 0 ? new Date() : null;
    }

    return this.db.deposit.update({
      where: { id },
      data: {
        ...rest,
        ...(paidDateValue !== undefined ? { paidDate: paidDateValue } : {}),
        ...(month !== undefined ? { date: new Date(`${month}-01T00:00:00.000Z`) } : {}),
      },
    });
  }

  async deleteDeposit(id: string) {
    return this.db.deposit.delete({ where: { id } });
  }

  async getCustomersByGroup(generatorGroupId: string) {
    return this.db.customer.findMany({
      where: { consumptionType: { generatorGroupId } },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phoneNumber: true,
        status: true,
        isCounter: true,
        description: true,
        consumptionStatusId: true,
        consumptionTypeId: true,
        consumptionStatus: { select: { Status: true } },
        consumptionType: { select: { description: true, Ampere: true, ThreePhase: true } },
        buildingFloor: { select: { floorNumber: true, apartmentSide: true, buildingId: true } },
      },
    });
  }
}
