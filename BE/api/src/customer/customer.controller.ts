import { Controller } from '@nestjs/common';
import { CustomerService } from './customer.service.js';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}
}
