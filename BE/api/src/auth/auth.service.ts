import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService) {}

  async login(email: string, password: string) {
    try {
      console.log('🚀 ~ AuthService ~ login ~ password:', password);
      console.log('🚀 ~ AuthService ~ login ~ email:', email);

      const data = await this.db.region.findMany({
        select: {
          id: true,
          name: true,
        },
      });
      console.log('🚀 ~ AuthService ~ login ~ data:', data);

      return { success: true };
    } catch (error) {
      throw new UnauthorizedException(
        error?.errorMessage ?? 'Invalid credentials',
      );
    }
  }
}
