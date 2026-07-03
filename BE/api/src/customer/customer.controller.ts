import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomerService } from './customer.service.js';
import { CreateConsumptionTypeDto, CreateCustomerDto, UpdateConsumptionTypeDto, UpdateCustomerDto } from './dto/customer.dto.js';

@ApiTags('Customer')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiBody({ type: CreateCustomerDto })
  createCustomer(@Body() body: CreateCustomerDto) {
    return this.customerService.createCustomer(body);
  }

  @Get('consumption-statuses')
  getConsumptionStatuses() {
    return this.customerService.getConsumptionStatuses();
  }

  @Get('consumption-types')
  @ApiQuery({ name: 'generatorGroupId', required: true, description: 'UUID of the GeneratorGroup' })
  getConsumptionTypes(@Query('generatorGroupId') generatorGroupId: string) {
    return this.customerService.getConsumptionTypes(generatorGroupId);
  }

  @Post('consumption-types')
  @ApiBody({ type: CreateConsumptionTypeDto })
  createConsumptionType(@Body() body: CreateConsumptionTypeDto) {
    return this.customerService.createConsumptionType(body);
  }

  @Patch('consumption-types/:id')
  @ApiBody({ type: UpdateConsumptionTypeDto })
  updateConsumptionType(@Param('id') id: string, @Body() body: UpdateConsumptionTypeDto) {
    return this.customerService.updateConsumptionType(id, body);
  }

  @Delete('consumption-types/:id')
  deleteConsumptionType(@Param('id') id: string) {
    return this.customerService.deleteConsumptionType(id);
  }

  @Get(':id')
  getCustomerDetails(@Param('id') id: string) {
    return this.customerService.getCustomerDetails(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateCustomerDto })
  updateCustomer(@Param('id') id: string, @Body() body: UpdateCustomerDto) {
    return this.customerService.updateCustomer(id, body);
  }

  @Delete(':id')
  deleteCustomer(@Param('id') id: string) {
    return this.customerService.deleteCustomer(id);
  }

  @Get()
  @ApiQuery({ name: 'generatorGroupId', required: true, description: 'UUID of the GeneratorGroup' })
  getCustomersByGroup(@Query('generatorGroupId') generatorGroupId: string) {
    return this.customerService.getCustomersByGroup(generatorGroupId);
  }
}
