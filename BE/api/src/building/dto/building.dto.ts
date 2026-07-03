import { ApiProperty } from '@nestjs/swagger';

export class CreateBuildingDto {
  @ApiProperty({ example: 'Tower A' })
  name!: string;

  @ApiProperty({ description: 'UUID of the GeneratorGroup this building belongs to' })
  generatorGroupId!: string;
}

export class UpdateBuildingDto {
  @ApiProperty()
  name!: string;
}

export class BuildingListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  floorCount!: number;
}
