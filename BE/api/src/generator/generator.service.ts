import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { WhatsappService } from '../whatsapp/whatsapp.service.js';
import { GeneratorsResponseDto, GroupOverviewDto, RegionResponseDto, RegionWhatsappResultDto } from './dto/region.dto.js';
import { mapGeneratorsToDto } from './helpers/mappers.js';
import {
  assertGeneratorGroupOwned,
  assertGeneratorOwned,
  assertRegionOwned,
  generatorGroupWhere,
  generatorWhere,
  regionWhere,
  type RequestingUser,
} from '../auth/ownership.util.js';

@Injectable()
export class GeneratorService {
  constructor(
    private readonly db: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async getAllRegions(user: RequestingUser): Promise<RegionResponseDto[]> {
    return this.db.region.findMany({
      where: regionWhere(user),
      select: {
        id: true,
        name: true,
        generatorGroups: {
          select: {
            id: true,
            name: true,
            generators: {
              select: {
                id: true,
                name: true,
                kvaCapacity: true,
                averageDieselConsumption: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async createRegion(name: string, user: RequestingUser) {
    return this.db.region.create({ data: { name, ownerId: user.id } });
  }

  async updateRegion(id: string, name: string, user: RequestingUser) {
    await assertRegionOwned(this.db, user, id);
    return this.db.region.update({ where: { id }, data: { name } });
  }

  async deleteRegion(id: string, user: RequestingUser) {
    await assertRegionOwned(this.db, user, id);

    const customerCount = await this.db.customer.count({
      where: { consumptionType: { generatorGroup: { regionId: id } } },
    });
    if (customerCount > 0) {
      throw new BadRequestException(
        `Cannot delete: ${customerCount} customer(s) are linked to this region.`,
      );
    }

    return this.db.$transaction(async (tx) => {
      const groups = await tx.generatorGroup.findMany({
        where: { regionId: id },
        select: { id: true },
      });
      const groupIds = groups.map((g) => g.id);

      if (groupIds.length > 0) {
        await tx.maintenanceLog.deleteMany({
          where: { generator: { generatorGroupId: { in: groupIds } } },
        });
        await tx.generator.deleteMany({ where: { generatorGroupId: { in: groupIds } } });
        await tx.monthlyPrice.deleteMany({ where: { generatorGroupId: { in: groupIds } } });
        await tx.consumptionType.deleteMany({ where: { generatorGroupId: { in: groupIds } } });
        await tx.building.deleteMany({ where: { generatorGroupId: { in: groupIds } } });
        await tx.generatorGroup.deleteMany({ where: { regionId: id } });
      }

      return tx.region.delete({ where: { id } });
    });
  }

  async sendRegionWhatsappBroadcast(regionId: string, message: string, user: RequestingUser): Promise<RegionWhatsappResultDto> {
    await assertRegionOwned(this.db, user, regionId);

    const customers = await this.db.customer.findMany({
      where: { consumptionType: { generatorGroup: { regionId } } },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true },
    });

    const withPhone = customers.filter((c) => c.phoneNumber && c.phoneNumber.trim() !== '');
    const skippedNoPhone = customers.length - withPhone.length;

    let sent = 0;
    let failed = 0;
    const errors: { customerId: string; customerName: string; error: string }[] = [];

    for (const c of withPhone) {
      const result = await this.whatsapp.sendTextMessage(c.phoneNumber!, message);
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push({ customerId: c.id, customerName: `${c.firstName} ${c.lastName}`, error: result.error ?? 'Unknown error' });
      }
    }

    return { totalCustomers: customers.length, sent, failed, skippedNoPhone, errors };
  }

  async createGeneratorGroup(name: string, regionId: string, user: RequestingUser) {
    await assertRegionOwned(this.db, user, regionId);
    return this.db.generatorGroup.create({
      data: { name, regionId },
      select: { id: true, name: true, regionId: true },
    });
  }

  async updateGeneratorGroup(id: string, dto: { name?: string; regionId?: string }, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, id);
    if (dto.regionId) await assertRegionOwned(this.db, user, dto.regionId);
    return this.db.generatorGroup.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, regionId: true },
    });
  }

  async deleteGeneratorGroup(id: string, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, id);

    const customerCount = await this.db.customer.count({
      where: { consumptionType: { generatorGroupId: id } },
    });
    if (customerCount > 0) {
      throw new BadRequestException(
        `Cannot delete: ${customerCount} customer(s) are linked to this group.`,
      );
    }

    return this.db.$transaction(async (tx) => {
      await tx.maintenanceLog.deleteMany({
        where: { generator: { generatorGroupId: id } },
      });
      await tx.generator.deleteMany({ where: { generatorGroupId: id } });
      await tx.monthlyPrice.deleteMany({ where: { generatorGroupId: id } });
      await tx.consumptionType.deleteMany({ where: { generatorGroupId: id } });
      await tx.building.deleteMany({ where: { generatorGroupId: id } });
      return tx.generatorGroup.delete({ where: { id } });
    });
  }

  async createGenerator(
    dto: {
      name: string;
      generatorGroupId: string;
      kvaCapacity: number;
      averageDieselConsumption: number;
      status: string;
    },
    user: RequestingUser,
  ) {
    await assertGeneratorGroupOwned(this.db, user, dto.generatorGroupId);
    return this.db.generator.create({
      data: dto,
      select: { id: true, name: true },
    });
  }

  async updateGenerator(
    id: string,
    dto: { name?: string; generatorGroupId?: string; kvaCapacity?: number; averageDieselConsumption?: number; status?: string },
    user: RequestingUser,
  ) {
    await assertGeneratorOwned(this.db, user, id);
    if (dto.generatorGroupId) await assertGeneratorGroupOwned(this.db, user, dto.generatorGroupId);
    return this.db.generator.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, kvaCapacity: true, averageDieselConsumption: true, status: true },
    });
  }

  async deleteGenerator(id: string, user: RequestingUser) {
    await assertGeneratorOwned(this.db, user, id);
    return this.db.$transaction(async (tx) => {
      await tx.maintenanceLog.deleteMany({ where: { generatorId: id } });
      return tx.generator.delete({ where: { id } });
    });
  }

  async getGroupSummaries(user: RequestingUser): Promise<GroupOverviewDto[]> {
    const groups = await this.db.generatorGroup.findMany({
      where: generatorGroupWhere(user),
      select: {
        id: true,
        name: true,
        region: { select: { name: true } },
        generators: { select: { kvaCapacity: true } },
        consumptionTypes: {
          select: {
            Ampere: true,
            customers: {
              select: {
                consumptionStatus: { select: { Status: true } },
                monthlyConsumptions: {
                  select: { amountPaid: true, monthlyFee: true },
                },
              },
            },
          },
        },
      },
    });

    return groups.map((g) => {
      const customers = g.consumptionTypes.flatMap((ct) =>
        ct.customers.map((c) => ({
          status: c.consumptionStatus.Status,
          ampere: ct.Ampere,
          monthlyConsumptions: c.monthlyConsumptions,
        })),
      );

      return {
        id: g.id,
        name: g.name,
        region: g.region.name,
        generatorCount: g.generators.length,
        totalKva: g.generators.reduce((s, gen) => s + gen.kvaCapacity, 0),
        totalClients: customers.length,
        totalLoad: customers.reduce((s, c) => s + c.ampere, 0),
        totalRevenue: customers.reduce(
          (s, c) => s + c.monthlyConsumptions.reduce((ms, mc) => ms + mc.amountPaid, 0),
          0,
        ),
        overdueCount: customers.filter((c) => c.status.toLowerCase() === 'overdue').length,
        unpaidCount: customers.filter((c) => c.status.toLowerCase() === 'unpaid').length,
      };
    });
  }

  async getGenerators(user: RequestingUser): Promise<GeneratorsResponseDto[]> {
    const result = await this.db.generator.findMany({
      where: generatorWhere(user),
      select: {
        id: true,
        name: true,
        status: true,
        averageDieselConsumption: true,
        kvaCapacity: true,
        generatorGroup: {
          select: {
            id: true,
            consumptionTypes: {
              select: {
                Ampere: true,
                customers: {
                  select: {
                    consumptionStatus: { select: { Status: true } },
                    monthlyConsumptions: {
                      select: { amountPaid: true, monthlyFee: true },
                    },
                  },
                },
              },
            },
            region: { select: { name: true } },
          },
        },
      },
    });
    return mapGeneratorsToDto(result);
  }
}
