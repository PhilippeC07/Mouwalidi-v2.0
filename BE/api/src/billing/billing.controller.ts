import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service.js';
import { CreateMonthlyBillingDto, UpdateMonthlyConsumptionDto } from './dto/billing.dto.js';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('monthly')
  @ApiBody({ type: CreateMonthlyBillingDto })
  createMonthlyBilling(@Body() body: CreateMonthlyBillingDto) {
    return this.billingService.createMonthlyBilling(body);
  }

  @Get('monthly')
  @ApiQuery({ name: 'generatorGroupId', required: true })
  @ApiQuery({ name: 'isCounter', required: true, type: Boolean })
  getMonthlyBillings(
    @Query('generatorGroupId') generatorGroupId: string,
    @Query('isCounter') isCounter: string,
  ) {
    return this.billingService.getMonthlyBillings(generatorGroupId, isCounter === 'true');
  }

  @Patch('monthly/:id')
  @ApiBody({ type: UpdateMonthlyConsumptionDto })
  updateMonthlyConsumption(
    @Param('id') id: string,
    @Body() body: UpdateMonthlyConsumptionDto,
  ) {
    return this.billingService.updateMonthlyConsumption(id, body);
  }
}
