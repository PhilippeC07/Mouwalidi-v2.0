import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { GeneratorsResponseDto, RegionResponseDto } from './dto/region.dto.js';
import { mapGeneratorsToDto } from './helpers/mappers.js';

@Injectable()
export class GeneratorService {
  constructor(private readonly db: PrismaService) {}

  async getAllRegions(): Promise<RegionResponseDto[]> {
    const result = await this.db.region.findMany({
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
              },
            },
          },
        },
      },
    });

    return result;
  }

  async createRegion(name: string) {
    const result = await this.db.region.create({
      data: {
        name,
      },
    });
    return result;
  }

  async updateRegion(id: string, name: string) {
    const result = await this.db.region.update({
      where: { id },
      data: {
        name: name,
      },
    });
    return result;
  }

  async getGenerators(): Promise<GeneratorsResponseDto[]> {
    const result = await this.db.generator.findMany({
      select: {
        id: true,
        name: true,
        averageDieselConsumption: true,
        kvaCapacity: true,
        generatorGroup: {
          select: {
            id: true,
            buildings: {
              select: {
                buildingfloors: {
                  select: {
                    customer: {
                      select: {
                        status: true,
                        consumptionType: {
                          select: {
                            Ampere: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            region: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    return mapGeneratorsToDto(result);
  }
}
