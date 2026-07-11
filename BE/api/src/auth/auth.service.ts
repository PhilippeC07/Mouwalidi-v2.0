import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { Role } from '../generated/prisma/client.js';
import { assertCustomerOwned, customerWhere, isSuperAdmin, type RequestingUser } from './ownership.util.js';

const SALT_ROUNDS = 12;
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  role: true,
  customerId: true,
  subscriptionStatus: true,
  stripeConnectOnboarded: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user) throw new UnauthorizedException('Invalid email or password.');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid email or password.');

    const accessToken = await this.jwtService.signAsync({
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        role: user.role,
        customerId: user.customerId,
        subscriptionStatus: user.subscriptionStatus,
        stripeConnectOnboarded: user.stripeConnectOnboarded,
      },
    };
  }

  // No public sign-up route calls this — only an already-authenticated
  // SUPERADMIN or ADMIN can create another account (CUSTOMER is blocked
  // entirely by RolesGuard). SUPERADMIN accounts are never created here —
  // only via the bootstrap script (scripts/create-superadmin.mjs).
  async register(dto: RegisterDto, requestingUser: RequestingUser) {
    const email = dto.email.trim().toLowerCase();
    if (!email || !dto.password) throw new BadRequestException('Email and password are required.');
    if (dto.password.length < 8) throw new BadRequestException('Password must be at least 8 characters.');

    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('An account with this email already exists.');

    if (requestingUser.role === Role.ADMIN) {
      if (dto.role !== 'CUSTOMER') throw new BadRequestException('Admins may only create customer accounts.');
      if (!dto.customerId) throw new BadRequestException('customerId is required for a customer account.');
      await assertCustomerOwned(this.db, requestingUser, dto.customerId);
    } else if (dto.role === 'CUSTOMER') {
      if (!dto.customerId) throw new BadRequestException('customerId is required for a customer account.');
      const exists = await this.db.customer.findUnique({ where: { id: dto.customerId }, select: { id: true } });
      if (!exists) throw new BadRequestException('Customer not found.');
    }

    if (dto.role === 'CUSTOMER') {
      const alreadyLinked = await this.db.user.findUnique({ where: { customerId: dto.customerId } });
      if (alreadyLinked) throw new BadRequestException('This customer already has an account.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.db.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name?.trim() || null,
        role: dto.role,
        customerId: dto.role === 'CUSTOMER' ? dto.customerId : null,
      },
      select: USER_SELECT,
    });
    return user;
  }

  async getUsers(requestingUser: RequestingUser) {
    if (isSuperAdmin(requestingUser)) {
      return this.db.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'asc' } });
    }
    return this.db.user.findMany({
      where: { role: Role.CUSTOMER, customer: customerWhere(requestingUser) },
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMe(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    if (!user) throw new UnauthorizedException('Account no longer exists.');
    return user;
  }
}
