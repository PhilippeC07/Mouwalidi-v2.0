import { ApiProperty } from '@nestjs/swagger';

export class CreateRegionDto {
  @ApiProperty({ example: 'Beirut' })
  name!: string;
}

export class UpdateRegionDto extends CreateRegionDto {}

export class CreateGeneratorGroupDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'UUID of the parent Region' })
  regionId!: string;
}

export class CreateGeneratorDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'UUID of the parent GeneratorGroup' })
  generatorGroupId!: string;

  @ApiProperty()
  kvaCapacity!: number;

  @ApiProperty()
  averageDieselConsumption!: number;

  @ApiProperty({ example: 'active', description: 'active | inactive | maintenance' })
  status!: string;
}

export class UpdateGeneratorGroupDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false, description: 'UUID of the new parent Region' })
  regionId?: string;
}

export class UpdateGeneratorDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false, description: 'UUID of the parent GeneratorGroup' })
  generatorGroupId?: string;

  @ApiProperty({ required: false })
  kvaCapacity?: number;

  @ApiProperty({ required: false })
  averageDieselConsumption?: number;

  @ApiProperty({ required: false, example: 'active' })
  status?: string;
}

export class GeneratorSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  kvaCapacity!: number;

  @ApiProperty()
  averageDieselConsumption!: number;

  @ApiProperty()
  status!: string;
}

export class GeneratorGroupSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [GeneratorSummaryDto] })
  generators!: GeneratorSummaryDto[];
}

export class RegionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [GeneratorGroupSummaryDto] })
  generatorGroups!: GeneratorGroupSummaryDto[];
}

export class GroupOverviewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  region!: string;

  @ApiProperty()
  generatorCount!: number;

  @ApiProperty()
  totalKva!: number;

  @ApiProperty()
  totalClients!: number;

  @ApiProperty()
  totalLoad!: number;

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  overdueCount!: number;

  @ApiProperty()
  unpaidCount!: number;
}

export class GeneratorsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty()
  kvaCapacity!: number;

  @ApiProperty()
  averageDieselConsumption!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalClients!: number;

  @ApiProperty()
  totalLoad!: number;

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  overdueCount!: number;

  @ApiProperty()
  unpaidCount!: number;

  @ApiProperty()
  monthlyBill!: number;
}
