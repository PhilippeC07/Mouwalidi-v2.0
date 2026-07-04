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

/* ── Accounting DTOs ── */
export class CustomerTypeSummaryDto {
  @ApiProperty() customerCount!: number;
  @ApiProperty() totalBilled!: number;
  @ApiProperty() totalPaid!: number;
  @ApiProperty() outstanding!: number;
}

export class RegionSummaryLineDto {
  @ApiProperty() regionId!: string;
  @ApiProperty() regionName!: string;
  @ApiProperty() totalBilled!: number;
  @ApiProperty() totalPaid!: number;
  @ApiProperty() outstanding!: number;
  @ApiProperty() customerCount!: number;
  @ApiProperty() collectionRate!: number;
}

export class GroupSummaryLineDto {
  @ApiProperty() groupId!: string;
  @ApiProperty() groupName!: string;
  @ApiProperty() regionName!: string;
  @ApiProperty() totalBilled!: number;
  @ApiProperty() totalPaid!: number;
  @ApiProperty() outstanding!: number;
  @ApiProperty() customerCount!: number;
  @ApiProperty() collectionRate!: number;
}

export class MonthlySummaryDto {
  @ApiProperty() month!: string;
  @ApiProperty() totalBilled!: number;
  @ApiProperty() totalPaid!: number;
  @ApiProperty() outstanding!: number;
  @ApiProperty() collectionRate!: number;
  @ApiProperty({ type: CustomerTypeSummaryDto }) counter!: CustomerTypeSummaryDto;
  @ApiProperty({ type: CustomerTypeSummaryDto }) fixed!: CustomerTypeSummaryDto;
  @ApiProperty({ type: [RegionSummaryLineDto] }) byRegion!: RegionSummaryLineDto[];
  @ApiProperty({ type: [GroupSummaryLineDto] }) byGroup!: GroupSummaryLineDto[];
}

export class MonthlyCustomerEntryDto {
  @ApiProperty() consumptionId!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty() groupName!: string;
  @ApiProperty() regionName!: string;
  @ApiProperty() balance!: number;
  @ApiProperty() amountPaid!: number;
  @ApiProperty() remaining!: number;
  @ApiProperty() status!: string;
  @ApiProperty() closedBalance!: boolean;
}

export class UpdateMonthlyConsumptionDto {
  @ApiProperty({ required: false })
  previousCounter?: number;

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
