import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  // imports: [PlayfabModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
