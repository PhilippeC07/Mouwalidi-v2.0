import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class CustomerService {
  constructor(private readonly db: PrismaService) {}
}
