import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import {
  SetAvailabilityDto,
  AvailabilityResponseDto,
  TimeSlotAvailableDto,
} from './dto/availability.dto';
import {
  UpdateSessionSettingsDto,
  SessionSettingsResponseDto,
} from './dto/session-settings.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set creator availability (replaces existing)' })
  @ApiResponse({
    status: 201,
    description: 'Availability set successfully',
    type: [AvailabilityResponseDto],
  })
  async setAvailability(
    @CurrentUser('creatorId') creatorId: string,
    @Body() dto: SetAvailabilityDto,
  ): Promise<AvailabilityResponseDto[]> {
    return this.availabilityService.setAvailability(creatorId, dto);
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my availability' })
  @ApiResponse({
    status: 200,
    description: 'Availability retrieved',
    type: [AvailabilityResponseDto],
  })
  async getMyAvailability(
    @CurrentUser('creatorId') creatorId: string,
  ): Promise<AvailabilityResponseDto[]> {
    return this.availabilityService.getAvailability(creatorId);
  }

  @Get('creator/:creatorId')
  @Public()
  @ApiOperation({ summary: "Get creator's availability" })
  @ApiParam({ name: 'creatorId', description: 'Creator ID' })
  @ApiResponse({
    status: 200,
    description: 'Availability retrieved',
    type: [AvailabilityResponseDto],
  })
  async getCreatorAvailability(
    @Param('creatorId') creatorId: string,
  ): Promise<AvailabilityResponseDto[]> {
    return this.availabilityService.getAvailability(creatorId);
  }

  @Get('slots/:creatorId')
  @Public()
  @ApiOperation({ summary: 'Get available booking slots for a creator' })
  @ApiParam({ name: 'creatorId', description: 'Creator ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({
    name: 'duration',
    description: 'Duration in minutes',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Available slots retrieved',
    type: [TimeSlotAvailableDto],
  })
  async getAvailableSlots(
    @Param('creatorId') creatorId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('duration') duration?: string,
  ): Promise<TimeSlotAvailableDto[]> {
    return this.availabilityService.getAvailableSlots(
      creatorId,
      startDate,
      endDate,
      duration ? parseInt(duration, 10) : 60,
    );
  }

  // Session Settings
  @Get('settings')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my session settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved',
    type: SessionSettingsResponseDto,
  })
  async getMySettings(
    @CurrentUser('creatorId') creatorId: string,
  ): Promise<SessionSettingsResponseDto> {
    return this.availabilityService.getSessionSettings(creatorId);
  }

  @Get('settings/:creatorId')
  @Public()
  @ApiOperation({ summary: "Get creator's session settings (public info)" })
  @ApiParam({ name: 'creatorId', description: 'Creator ID' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved',
    type: SessionSettingsResponseDto,
  })
  async getCreatorSettings(
    @Param('creatorId') creatorId: string,
  ): Promise<SessionSettingsResponseDto> {
    return this.availabilityService.getSessionSettings(creatorId);
  }

  @Patch('settings')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my session settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated',
    type: SessionSettingsResponseDto,
  })
  async updateMySettings(
    @CurrentUser('creatorId') creatorId: string,
    @Body() dto: UpdateSessionSettingsDto,
  ): Promise<SessionSettingsResponseDto> {
    return this.availabilityService.updateSessionSettings(creatorId, dto);
  }
}
