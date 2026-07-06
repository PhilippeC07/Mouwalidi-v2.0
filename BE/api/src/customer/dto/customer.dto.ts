import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Michael' })
  middleName?: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiPropertyOptional({ example: '+961 70 000 000' })
  phoneNumber?: string;

  @ApiPropertyOptional()
  specialMonthlyFee?: number;

  @ApiPropertyOptional()
  specialKwhPrice?: number;

  @ApiPropertyOptional()
  specialPeriod?: number;

  @ApiProperty({ example: false })
  isCounter!: boolean;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ description: 'UUID of the ConsumptionStatus record' })
  consumptionStatusId!: string;

  @ApiProperty({ description: 'UUID of the ConsumptionType record for the generator group' })
  consumptionTypeId!: string;

  @ApiProperty({ description: 'UUID of the Building to assign this customer to' })
  buildingId!: string;

  @ApiProperty({ example: 3 })
  floorNumber!: number;

  @ApiProperty({ example: 'Left' })
  apartmentSide!: string;
}

export class CreateConsumptionTypeDto {
  @ApiProperty({ example: 'Standard subscription' })
  description!: string;

  @ApiProperty({ example: 5 })
  Ampere!: number;

  @ApiProperty({ example: false })
  isCounter!: boolean;

  @ApiProperty({ example: false })
  ThreePhase!: boolean;

  @ApiPropertyOptional({ description: 'Flat monthly subscription fee, only used for counter (metered) types', example: 0 })
  monthlyFee?: number;

  @ApiProperty({ description: 'UUID of the GeneratorGroup' })
  generatorGroupId!: string;
}

export class UpdateConsumptionTypeDto {
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() Ampere?: number;
  @ApiPropertyOptional() isCounter?: boolean;
  @ApiPropertyOptional() ThreePhase?: boolean;
  @ApiPropertyOptional() monthlyFee?: number;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() middleName?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiPropertyOptional() phoneNumber?: string;
  @ApiPropertyOptional() specialMonthlyFee?: number;
  @ApiPropertyOptional() specialKwhPrice?: number;
  @ApiPropertyOptional() specialPeriod?: number;
  @ApiPropertyOptional() isCounter?: boolean;
  @ApiPropertyOptional() status?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() consumptionStatusId?: string;
  @ApiPropertyOptional() consumptionTypeId?: string;
  @ApiPropertyOptional() buildingId?: string;
  @ApiPropertyOptional() floorNumber?: number;
  @ApiPropertyOptional() apartmentSide?: string;
}

export class ConsumptionStatusResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  Status!: string;
}

export class ConsumptionTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  Ampere!: number;

  @ApiProperty()
  isCounter!: boolean;

  @ApiProperty()
  ThreePhase!: boolean;

  @ApiProperty()
  monthlyFee!: number;
}

class CustomerConsumptionStatusDto {
  @ApiProperty()
  Status!: string;
}

class CustomerConsumptionTypeDto {
  @ApiProperty()
  description!: string;

  @ApiProperty()
  Ampere!: number;

  @ApiProperty()
  ThreePhase!: boolean;
}

export class CustomerListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiPropertyOptional()
  middleName?: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isCounter!: boolean;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: CustomerConsumptionStatusDto })
  consumptionStatus!: CustomerConsumptionStatusDto;

  @ApiProperty({ type: CustomerConsumptionTypeDto })
  consumptionType!: CustomerConsumptionTypeDto;
}
