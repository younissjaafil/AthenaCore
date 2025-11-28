import { ApiProperty } from '@nestjs/swagger';

export class WhishBalanceResponseDto {
  @ApiProperty({
    description: 'Current account balance in LBP',
    example: 217.718,
  })
  balance: number;
}

export class WhishApiResponse<T> {
  @ApiProperty({ description: 'Success status', example: true })
  status: boolean;

  @ApiProperty({ description: 'Error code if failed', example: null })
  code: string | null;

  @ApiProperty({ description: 'Dialog information', example: null })
  dialog: any | null;

  @ApiProperty({ description: 'Extra data', example: null })
  extra: any | null;

  @ApiProperty({ description: 'Response data' })
  data: T;
}
