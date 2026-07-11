import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiPropertyOptional({ example: '+961 70 000 000' })
  phoneNumber?: string;

  @ApiProperty({ example: 'Collector' })
  role!: string;

  @ApiProperty({ example: 500, description: 'Monthly salary in USD' })
  salary!: number;

  @ApiPropertyOptional({ example: 'active' })
  status?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [String], description: 'UUIDs of the Regions this employee is assigned to' })
  regionIds?: string[];

  @ApiPropertyOptional({ description: 'Whether customers in this employee\'s regions can see them on their team page' })
  visibleToCustomers?: boolean;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiPropertyOptional() phoneNumber?: string;
  @ApiPropertyOptional() role?: string;
  @ApiPropertyOptional() salary?: number;
  @ApiPropertyOptional() status?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional({ type: [String] }) regionIds?: string[];
  @ApiPropertyOptional() visibleToCustomers?: boolean;
}

class EmployeeRegionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class EmployeeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  salary!: number;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: [EmployeeRegionDto] })
  regions!: EmployeeRegionDto[];

  @ApiPropertyOptional()
  profilePictureUrl?: string | null;

  @ApiPropertyOptional()
  idDocumentUrl?: string | null;

  @ApiProperty()
  visibleToCustomers!: boolean;
}

export class TeamMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  phoneNumber?: string | null;

  @ApiProperty()
  role!: string;

  @ApiPropertyOptional()
  profilePictureUrl?: string | null;
}
