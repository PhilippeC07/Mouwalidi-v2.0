import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service.js';
import { BulkUpdateCountersDto, CreateMonthlyBillingDto, CreateSingleBillingDto, CustomerAllTimeBalanceDto, CustomerBalanceDto, GetReceiptsDto, MonthlyCounterEntryDto, MonthlyCustomerEntryDto, MonthlySummaryDto, ReceiptDto, RegionBillingSummaryDto, UpdateMonthlyConsumptionDto } from './dto/billing.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@ApiTags('Billing')
@Controller('billing')
@Roles(Role.SUPERADMIN, Role.ADMIN)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /* ── Accounting ── */
  @Get('accounting/summary')
  @ApiQuery({ name: 'month', required: true, description: 'YYYY-MM' })
  getMonthlySummary(@Query('month') month: string, @CurrentUser() user: AuthenticatedUser): Promise<MonthlySummaryDto> {
    return this.billingService.getMonthlySummary(month, user);
  }

  @Get('accounting/receivables')
  @ApiQuery({ name: 'month', required: true })
  getMonthlyReceivables(@Query('month') month: string, @CurrentUser() user: AuthenticatedUser): Promise<MonthlyCustomerEntryDto[]> {
    return this.billingService.getMonthlyReceivables(month, user);
  }

  @Get('accounting/payments')
  @ApiQuery({ name: 'month', required: true })
  getMonthlyPayments(@Query('month') month: string, @CurrentUser() user: AuthenticatedUser): Promise<MonthlyCustomerEntryDto[]> {
    return this.billingService.getMonthlyPayments(month, user);
  }

  @Get('region/:id/summary')
  getRegionBillingSummary(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<RegionBillingSummaryDto> {
    return this.billingService.getRegionBillingSummary(id, user);
  }

  @Get('monthly/balances')
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'generatorGroupId', required: true })
  getMonthlyCustomerBalances(
    @Query('month') month: string,
    @Query('generatorGroupId') generatorGroupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerBalanceDto[]> {
    return this.billingService.getMonthlyCustomerBalances(month, generatorGroupId, user);
  }

  @Get('monthly/balances/all-time')
  @ApiQuery({ name: 'generatorGroupId', required: true })
  getGroupCustomerAllTimeBalances(
    @Query('generatorGroupId') generatorGroupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerAllTimeBalanceDto[]> {
    return this.billingService.getGroupCustomerAllTimeBalances(generatorGroupId, user);
  }

  @Get('monthly/counters')
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'generatorGroupId', required: true })
  getMonthlyCounterEntries(
    @Query('month') month: string,
    @Query('generatorGroupId') generatorGroupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MonthlyCounterEntryDto[]> {
    return this.billingService.getMonthlyCounterEntries(month, generatorGroupId, user);
  }

  @Patch('monthly/bulk-counters')
  @ApiBody({ type: BulkUpdateCountersDto })
  bulkUpdateCounters(@Body() body: BulkUpdateCountersDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.bulkUpdateCounters(body.updates, user);
  }

  @Post('monthly')
  @ApiBody({ type: CreateMonthlyBillingDto })
  createMonthlyBilling(@Body() body: CreateMonthlyBillingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.createMonthlyBilling(body, user);
  }

  @Get('monthly')
  @ApiQuery({ name: 'generatorGroupId', required: true })
  @ApiQuery({ name: 'isCounter', required: true, type: Boolean })
  getMonthlyBillings(
    @Query('generatorGroupId') generatorGroupId: string,
    @Query('isCounter') isCounter: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.getMonthlyBillings(generatorGroupId, isCounter === 'true', user);
  }

  @Get('customer/:customerId/monthly-rate')
  @ApiQuery({ name: 'month', required: true, description: 'YYYY-MM' })
  getCustomerMonthlyRate(
    @Param('customerId') customerId: string,
    @Query('month') month: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.getCustomerMonthlyRate(customerId, month, user);
  }

  @Post('customer/:customerId/monthly')
  @ApiBody({ type: CreateSingleBillingDto })
  createSingleBilling(
    @Param('customerId') customerId: string,
    @Body() body: CreateSingleBillingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.createSingleBilling(customerId, body, user);
  }

  // CUSTOMER may fetch their own receipts (self-only, enforced in the
  // service) — overrides the controller-level @Roles for this handler only.
  @Post('receipts')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.CUSTOMER)
  @ApiBody({ type: GetReceiptsDto })
  getReceipts(@Body() body: GetReceiptsDto, @CurrentUser() user: AuthenticatedUser): Promise<ReceiptDto[]> {
    return this.billingService.getReceipts(body.customerIds, body.months, user);
  }

  @Patch('monthly/:id')
  @ApiBody({ type: UpdateMonthlyConsumptionDto })
  updateMonthlyConsumption(
    @Param('id') id: string,
    @Body() body: UpdateMonthlyConsumptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.updateMonthlyConsumption(id, body, user);
  }
}
