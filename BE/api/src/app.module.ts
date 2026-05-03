import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from './prisma.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { GeneratorController } from './generator/generator.controller.js';
import { GeneratorService } from './generator/generator.service.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AuthController, GeneratorController],
  providers: [PrismaService, AuthService, GeneratorService],
})
export class AppModule {}
