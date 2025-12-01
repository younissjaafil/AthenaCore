import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum UserIntent {
  LEARN = 'learn',
  EARN = 'earn',
}

export class SetIntentDto {
  @ApiProperty({
    enum: UserIntent,
    example: UserIntent.LEARN,
    description: 'User intent: learn (consumer) or earn (creator)',
  })
  @IsNotEmpty()
  @IsEnum(UserIntent)
  intent: UserIntent;
}
