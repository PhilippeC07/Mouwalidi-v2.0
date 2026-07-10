import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto.js';
import { assertBuildingOwned, assertGeneratorGroupOwned, type RequestingUser } from '../auth/ownership.util.js';

@Injectable()
export class BuildingService {
  constructor(private readonly db: PrismaService) {}

  async createBuilding(dto: CreateBuildingDto, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, dto.generatorGroupId);
    return this.db.building.create({ data: dto });
  }

  async getBuildingsByGroup(generatorGroupId: string, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, generatorGroupId);
    const buildings = await this.db.building.findMany({
      where: { generatorGroupId },
      select: {
        id: true,
        name: true,
        _count: { select: { buildingfloors: true } },
      },
      orderBy: { name: 'asc' },
    });

    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      floorCount: b._count.buildingfloors,
    }));
  }

  async updateBuilding(id: string, dto: UpdateBuildingDto, user: RequestingUser) {
    await assertBuildingOwned(this.db, user, id);
    return this.db.building.update({ where: { id }, data: dto });
  }

  async deleteBuilding(id: string, user: RequestingUser) {
    await assertBuildingOwned(this.db, user, id);
    return this.db.building.delete({ where: { id } });
  }

  async getBuildingDetails(generatorGroupId: string, user: RequestingUser) {
    await assertGeneratorGroupOwned(this.db, user, generatorGroupId);
    return this.db.building.findMany({
      where: { generatorGroupId },
      select: {
        id: true,
        name: true,
        buildingfloors: {
          select: {
            id: true,
            floorNumber: true,
            apartmentSide: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{ floorNumber: 'asc' }, { apartmentSide: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
