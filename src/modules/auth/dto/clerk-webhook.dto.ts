import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClerkWebhookDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsObject()
  data: any;
}

export class ClerkUserWebhookData {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  created_at: number;
  updated_at: number;
}
