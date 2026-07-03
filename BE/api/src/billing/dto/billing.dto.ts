import { ApiProperty } from '@nestjs/swagger';

export class CreateMonthlyBillingDto {
  @ApiProperty({ description: 'UUID of the GeneratorGroup' })
  generatorGroupId!: string;

  @ApiProperty({ example: '2025-01', description: 'Month in YYYY-MM format' })
  month!: string;

  @ApiProperty({ description: 'kWh price (for counter customers) or price per Amp (for fixed customers)' })
  price!: number;

  @ApiProperty({ description: 'true = counter customers, false = fixed/ampere customers' })
  isCounter!: boolean;
}

export class UpdateMonthlyConsumptionDto {
  @ApiProperty({ required: false })
  currentCounter?: number;

  @ApiProperty({ required: false })
  monthlyFee?: number;

  @ApiProperty({ required: false })
  amountPaid?: number;

  @ApiProperty({ required: false })
  consumptionStatusId?: string;

  @ApiProperty({ required: false })
  isCut?: boolean;

  @ApiProperty({ required: false })
  closedBalance?: boolean;
}
