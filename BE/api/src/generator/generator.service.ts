import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { GeneratorsResponseDto, RegionResponseDto } from './dto/region.dto.js';
import { mapGeneratorsToDto } from './helpers/mappers.js';

@Injectable()
export class GeneratorService {
  constructor(private readonly db: PrismaService) {}

  async getAllRegions(): Promise<RegionResponseDto[]> {
    return this.db.region.findMany({
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

  async createRegion(name: string) {
    return this.db.region.create({ data: { name } });
  }

  async updateRegion(id: string, name: string) {
    return this.db.region.update({ where: { id }, data: { name } });
  }

  async deleteRegion(id: string) {
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

  async createGeneratorGroup(name: string, regionId: string) {
    return this.db.generatorGroup.create({
      data: { name, regionId },
      select: { id: true, name: true, regionId: true },
    });
  }

  async updateGeneratorGroup(id: string, dto: { name?: string; regionId?: string }) {
    return this.db.generatorGroup.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, regionId: true },
    });
  }

  async deleteGeneratorGroup(id: string) {
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

  async createGenerator(dto: {
    name: string;
    generatorGroupId: string;
    kvaCapacity: number;
    averageDieselConsumption: number;
    status: string;
  }) {
    return this.db.generator.create({
      data: dto,
      select: { id: true, name: true },
    });
  }

  async updateGenerator(
    id: string,
    dto: { name?: string; generatorGroupId?: string; kvaCapacity?: number; averageDieselConsumption?: number; status?: string },
  ) {
    return this.db.generator.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, kvaCapacity: true, averageDieselConsumption: true, status: true },
    });
  }

  async deleteGenerator(id: string) {
    return this.db.$transaction(async (tx) => {
      await tx.maintenanceLog.deleteMany({ where: { generatorId: id } });
      return tx.generator.delete({ where: { id } });
    });
  }

  async getGenerators(): Promise<GeneratorsResponseDto[]> {
    const result = await this.db.generator.findMany({
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
