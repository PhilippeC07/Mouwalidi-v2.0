import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service.js';
import { StripeService } from '../stripe/stripe.service.js';
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
import {
  assertBuildingOwned,
  assertConsumptionTypeOwned,
  assertCustomerAccessible,
  assertCustomerOwned,
  assertGeneratorGroupOwned,
  type RequestingUser,
} from '../auth/ownership.util.js';
import { Role } from '../generated/prisma/client.js';

const SALT_ROUNDS = 12;

@Injectable()
export class CustomerService {
  constructor(
    private readonly db: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  /** The admin/superadmin whose subscription is billed per-customer for this consumptionType's region. */
  private async getOwnerIdForConsumptionType(consumptionTypeId: string): Promise<string | null> {
    const consumptionType = await this.db.consumptionType.findUnique({
      where: { id: consumptionTypeId },
      select: { generatorGroup: { select: { region: { select: { ownerId: true } } } } },
    });
    return consumptionType?.generatorGroup.region.ownerId ?? null;
  }

  async createCustomer(dto: CreateCustomerDto, user: RequestingUser) {
    const { buildingId, floorNumber, apartmentSide, accountEmail, accountPassword, ...customerData } = dto;
    await assertConsumptionTypeOwned(this.db, user, dto.consumptionTypeId);
    await assertBuildingOwned(this.db, user, buildingId);

    const wantsAccount = !!(accountEmail && accountPassword);
    let accountPasswordHash: string | undefined;
    let normalizedEmail: string | undefined;
    if (accountEmail && accountPassword) {
      normalizedEmail = accountEmail.trim().toLowerCase();
      if (accountPassword.length < 8) {
        throw new BadRequestException('Account password must be at least 8 characters.');
      }
      const existing = await this.db.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) throw new BadRequestException('An account with this email already exists.');
      accountPasswordHash = await bcrypt.hash(accountPassword, SALT_ROUNDS);
    }

    const customer = await this.db.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: customerData });
      await tx.buildingFloor.create({
        data: { floorNumber, apartmentSide, buildingId, customerId: customer.id },
      });
      if (wantsAccount && normalizedEmail && accountPasswordHash) {
        await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: accountPasswordHash,
            role: Role.CUSTOMER,
            customerId: customer.id,
            name: `${customer.firstName} ${customer.lastName}`.trim(),
          },
        });
      }
      return customer;
    });

    const ownerId = await this.getOwnerIdForConsumptionType(dto.consumptionTypeId);
    if (ownerId) await this.stripeService.syncSubscriptionQuantity(ownerId);

    return customer;
  }

  async getConsumptionStatuses(): Promise<ConsumptionStatusResponseDto[]> {
    return this.db.consumptionStatus.findMany({
      select: { id: true, Status: true },
    });
  }

  async getConsumptionTypes(generatorGroupId: string, user: RequestingUser): Promise<ConsumptionTypeResponseDto[]> {
    await assertGeneratorGroupOwned(this.db, user, generatorGroupId);
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

  async createConsumptionType(dto: CreateConsumptionTypeDto, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, dto.generatorGroupId);
    return this.db.consumptionType.create({ data: dto });
  }

  async updateConsumptionType(id: string, dto: UpdateConsumptionTypeDto, user: RequestingUser) {
    await assertConsumptionTypeOwned(this.db, user, id);
    return this.db.consumptionType.update({ where: { id }, data: dto });
  }

  async deleteConsumptionType(id: string, user: RequestingUser) {
    await assertConsumptionTypeOwned(this.db, user, id);
    return this.db.consumptionType.delete({ where: { id } });
  }

  async deleteCustomer(id: string, user: RequestingUser) {
    await assertCustomerOwned(this.db, user, id);
    const customer = await this.db.customer.findUnique({ where: { id }, select: { consumptionTypeId: true } });
    const ownerId = customer ? await this.getOwnerIdForConsumptionType(customer.consumptionTypeId) : null;

    const deleted = await this.db.$transaction(async (tx) => {
      await tx.monthlyConsumption.deleteMany({ where: { customerId: id } });
      await tx.deposit.deleteMany({ where: { customerId: id } });
      await tx.buildingFloor.deleteMany({ where: { customerId: id } });
      return tx.customer.delete({ where: { id } });
    });

    if (ownerId) await this.stripeService.syncSubscriptionQuantity(ownerId);

    return deleted;
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto, user: RequestingUser) {
    await assertCustomerOwned(this.db, user, id);
    if (dto.consumptionTypeId) await assertConsumptionTypeOwned(this.db, user, dto.consumptionTypeId);
    const { buildingId, floorNumber, apartmentSide, ...customerData } = dto;
    if (buildingId) await assertBuildingOwned(this.db, user, buildingId);

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

  async getCustomerDetails(id: string, user: RequestingUser) {
    await assertCustomerAccessible(this.db, user, id);
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

  async createDeposit(customerId: string, dto: CreateDepositDto, user: RequestingUser) {
    await assertCustomerOwned(this.db, user, customerId);
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

  async updateDeposit(id: string, dto: UpdateDepositDto, user: RequestingUser) {
    const deposit = await this.db.deposit.findUnique({ where: { id }, select: { customerId: true } });
    if (!deposit) throw new NotFoundException('Deposit not found.');
    await assertCustomerOwned(this.db, user, deposit.customerId);

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

  async deleteDeposit(id: string, user: RequestingUser) {
    const deposit = await this.db.deposit.findUnique({ where: { id }, select: { customerId: true } });
    if (!deposit) throw new NotFoundException('Deposit not found.');
    await assertCustomerOwned(this.db, user, deposit.customerId);
    return this.db.deposit.delete({ where: { id } });
  }

  async getCustomersByGroup(generatorGroupId: string, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, generatorGroupId);
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
