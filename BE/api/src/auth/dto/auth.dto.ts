import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Role } from '../../generated/prisma/client.js';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  email!: string;

  @ApiProperty()
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'someone@example.com' })
  email!: string;

  @ApiProperty({ description: 'Minimum 8 characters' })
  password!: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ enum: ['ADMIN', 'CUSTOMER'], description: 'SUPERADMIN accounts can only be created via the bootstrap script.' })
  role!: 'ADMIN' | 'CUSTOMER';

  @ApiPropertyOptional({ description: 'Required when role is CUSTOMER — the Customer this login is linked to.' })
  customerId?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  role!: Role;

  @ApiPropertyOptional({ nullable: true })
  customerId!: string | null;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
