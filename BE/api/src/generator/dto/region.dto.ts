import { ApiProperty } from '@nestjs/swagger';

export class CreateRegionDto {
  @ApiProperty({ example: 'Beirut' })
  name!: string;
}

export class UpdateRegionDto extends CreateRegionDto {}

export class GeneratorSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
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
