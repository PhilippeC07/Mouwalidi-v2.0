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

export class RegionGroupBillingLineDto {
  @ApiProperty() groupId!: string;
  @ApiProperty() groupName!: string;
  @ApiProperty() customerCount!: number;
  @ApiProperty() totalBilled!: number;
  @ApiProperty() totalPaid!: number;
  @ApiProperty() outstanding!: number;
  @ApiProperty() collectionRate!: number;
}

export class RegionMonthlyTrendPointDto {
  @ApiProperty() month!: string;
  @ApiProperty() billed!: number;
  @ApiProperty() paid!: number;
}

export class RegionBillingSummaryDto {
  @ApiProperty({ description: 'All-time total across every bill and deposit for customers in this region' })
  totalBilled!: number;
  @ApiProperty() totalPaid!: number;
  @ApiProperty() outstanding!: number;
  @ApiProperty() collectionRate!: number;
  @ApiProperty({ type: [RegionGroupBillingLineDto] }) byGroup!: RegionGroupBillingLineDto[];
  @ApiProperty({ type: [RegionMonthlyTrendPointDto], description: 'Last 6 calendar months, recurring monthly bills only (deposits excluded)' })
  monthlyTrend!: RegionMonthlyTrendPointDto[];
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
  @ApiProperty({ required: false, nullable: true }) paidDate!: string | null;
}

export class CustomerBalanceDto {
  @ApiProperty() customerId!: string;
  @ApiProperty() consumptionId!: string;
  @ApiProperty() balance!: number;
  @ApiProperty() amountPaid!: number;
  @ApiProperty() remaining!: number;
  @ApiProperty() closedBalance!: boolean;
}

export class CustomerAllTimeBalanceDto {
  @ApiProperty() customerId!: string;
  @ApiProperty({ description: 'Total unpaid amount across every bill and deposit for this customer' })
  remaining!: number;
}

export class MonthlyCounterEntryDto {
  @ApiProperty() consumptionId!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty() groupName!: string;
  @ApiProperty() regionName!: string;
  @ApiProperty() previousCounter!: number;
  @ApiProperty() currentCounter!: number;
  @ApiProperty() kwhPrice!: number;
  @ApiProperty() closedBalance!: boolean;
}

export class CounterUpdateItemDto {
  @ApiProperty() consumptionId!: string;
  @ApiProperty() currentCounter!: number;
}

export class BulkUpdateCountersDto {
  @ApiProperty({ type: [CounterUpdateItemDto] })
  updates!: CounterUpdateItemDto[];
}

export class CreateSingleBillingDto {
  @ApiProperty({ example: '2025-01', description: 'Month in YYYY-MM format' })
  month!: string;

  @ApiProperty({
    required: false,
    description: 'kWh price (counter) or price per Amp (fixed). Required only if no billing rate exists yet for this month/group/type.',
  })
  price?: number;
}

export class GetReceiptsDto {
  @ApiProperty({ type: [String], description: 'Customer IDs to fetch receipts for' })
  customerIds!: string[];

  @ApiProperty({ type: [String], example: ['2025-01'], description: 'Months in YYYY-MM format' })
  months!: string[];
}

export class ReceiptDto {
  @ApiProperty() consumptionId!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty({ nullable: true, required: false }) buildingName!: string | null;
  @ApiProperty() date!: string;
  @ApiProperty() isCounter!: boolean;
  @ApiProperty() ampere!: number;
  @ApiProperty() threePhase!: boolean;
  @ApiProperty() monthlyFee!: number;
  @ApiProperty() previousCounter!: number;
  @ApiProperty() currentCounter!: number;
  @ApiProperty() kwhPrice!: number;
  @ApiProperty() amountPaid!: number;
  @ApiProperty() balance!: number;
  @ApiProperty() remaining!: number;
}

export class UpdateMonthlyConsumptionDto {
  @ApiProperty({ required: false })
  previousCounter?: number;

  @ApiProperty({ required: false })
  currentCounter?: number;

  @ApiProperty({ required: false })
  monthlyFee?: number;

  @ApiProperty({ required: false, nullable: true, description: 'Manual balance override, bypassing the usage/fee formula. Pass null to revert to the computed balance.' })
  balanceOverride?: number | null;

  @ApiProperty({ required: false })
  amountPaid?: number;

  @ApiProperty({ required: false, description: 'Date the payment was made (ISO date, e.g. 2026-07-05)' })
  paidDate?: string;

  @ApiProperty({ required: false })
  consumptionStatusId?: string;

  @ApiProperty({ required: false })
  isCut?: boolean;

  @ApiProperty({ required: false })
  closedBalance?: boolean;
}
