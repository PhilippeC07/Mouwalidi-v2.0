import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetWhishPhoneNumberDto {
  @ApiProperty() phoneNumber!: string;
}

export class SubmitClaimDto {
  @ApiProperty() referenceNumber!: string;
  @ApiPropertyOptional() note?: string;
}

export class RejectClaimDto {
  @ApiPropertyOptional() note?: string;
}
