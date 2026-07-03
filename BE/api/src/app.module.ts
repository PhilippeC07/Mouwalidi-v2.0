import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from './prisma.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { GeneratorController } from './generator/generator.controller.js';
import { GeneratorService } from './generator/generator.service.js';
import { CustomerController } from './customer/customer.controller.js';
import { CustomerService } from './customer/customer.service.js';
import { BuildingController } from './building/building.controller.js';
import { BuildingService } from './building/building.service.js';
import { BillingController } from './billing/billing.controller.js';
import { BillingService } from './billing/billing.service.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AuthController, GeneratorController, CustomerController, BuildingController, BillingController],
  providers: [PrismaService, AuthService, GeneratorService, CustomerService, BuildingService, BillingService],
})
export class AppModule {}
