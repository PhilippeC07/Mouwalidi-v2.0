import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomerService } from './customer.service.js';
import { CreateConsumptionTypeDto, CreateCustomerDto, CreateDepositDto, UpdateConsumptionTypeDto, UpdateCustomerDto, UpdateDepositDto } from './dto/customer.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@ApiTags('Customer')
@Controller('customer')
@Roles(Role.SUPERADMIN, Role.ADMIN)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiBody({ type: CreateCustomerDto })
  createCustomer(@Body() body: CreateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.createCustomer(body, user);
  }

  @Get('consumption-statuses')
  getConsumptionStatuses() {
    return this.customerService.getConsumptionStatuses();
  }

  @Get('consumption-types')
  @ApiQuery({ name: 'generatorGroupId', required: true, description: 'UUID of the GeneratorGroup' })
  getConsumptionTypes(@Query('generatorGroupId') generatorGroupId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.getConsumptionTypes(generatorGroupId, user);
  }

  @Post('consumption-types')
  @ApiBody({ type: CreateConsumptionTypeDto })
  createConsumptionType(@Body() body: CreateConsumptionTypeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.createConsumptionType(body, user);
  }

  @Patch('consumption-types/:id')
  @ApiBody({ type: UpdateConsumptionTypeDto })
  updateConsumptionType(@Param('id') id: string, @Body() body: UpdateConsumptionTypeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.updateConsumptionType(id, body, user);
  }

  @Delete('consumption-types/:id')
  deleteConsumptionType(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.deleteConsumptionType(id, user);
  }

  @Post(':customerId/deposits')
  @ApiBody({ type: CreateDepositDto })
  createDeposit(@Param('customerId') customerId: string, @Body() body: CreateDepositDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.createDeposit(customerId, body, user);
  }

  @Patch('deposits/:id')
  @ApiBody({ type: UpdateDepositDto })
  updateDeposit(@Param('id') id: string, @Body() body: UpdateDepositDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.updateDeposit(id, body, user);
  }

  @Delete('deposits/:id')
  deleteDeposit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.deleteDeposit(id, user);
  }

  // The one route a CUSTOMER-role account may call — overrides the
  // controller-level @Roles restriction for this handler only.
  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.CUSTOMER)
  getCustomerDetails(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.getCustomerDetails(id, user);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateCustomerDto })
  updateCustomer(@Param('id') id: string, @Body() body: UpdateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.updateCustomer(id, body, user);
  }

  @Delete(':id')
  deleteCustomer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.deleteCustomer(id, user);
  }

  @Get()
  @ApiQuery({ name: 'generatorGroupId', required: true, description: 'UUID of the GeneratorGroup' })
  getCustomersByGroup(@Query('generatorGroupId') generatorGroupId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customerService.getCustomersByGroup(generatorGroupId, user);
  }
}
