import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from './prisma.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { SubscriptionGuard } from './auth/subscription.guard.js';
import { GeneratorController } from './generator/generator.controller.js';
import { GeneratorService } from './generator/generator.service.js';
import { CustomerController } from './customer/customer.controller.js';
import { CustomerService } from './customer/customer.service.js';
import { BuildingController } from './building/building.controller.js';
import { BuildingService } from './building/building.service.js';
import { BillingController } from './billing/billing.controller.js';
import { BillingService } from './billing/billing.service.js';
import { WhatsappService } from './whatsapp/whatsapp.service.js';
import { StripeController } from './stripe/stripe.controller.js';
import { StripeService } from './stripe/stripe.service.js';
import { WhishController } from './whish/whish.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, GeneratorController, CustomerController, BuildingController, BillingController, StripeController, WhishController],
  providers: [
    PrismaService,
    AuthService,
    GeneratorService,
    CustomerService,
    BuildingService,
    BillingService,
    WhatsappService,
    StripeService,
    JwtAuthGuard,
    RolesGuard,
    SubscriptionGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
  ],
})
export class AppModule {}
