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
  SetDateOverridesDto,
  DateOverrideResponseDto,
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
    @CurrentUser('sub') userId: string,
    @Body() dto: SetAvailabilityDto,
  ): Promise<AvailabilityResponseDto[]> {
    const creatorId =
      await this.availabilityService.getCreatorIdFromUserId(userId);
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
    @CurrentUser('sub') userId: string,
  ): Promise<AvailabilityResponseDto[]> {
    const creatorId =
      await this.availabilityService.getCreatorIdFromUserId(userId);
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
    @CurrentUser('sub') userId: string,
  ): Promise<SessionSettingsResponseDto> {
    const creatorId =
      await this.availabilityService.getCreatorIdFromUserId(userId);
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
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateSessionSettingsDto,
  ): Promise<SessionSettingsResponseDto> {
    const creatorId =
      await this.availabilityService.getCreatorIdFromUserId(userId);
    return this.availabilityService.updateSessionSettings(creatorId, dto);
  }

  // Date Overrides (Simple version for Lebanon)
  @Post('overrides')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set date-specific availability',
    description: 'Simple date overrides for Lebanon timezone',
  })
  @ApiResponse({
    status: 201,
    description: 'Date overrides saved',
    type: [DateOverrideResponseDto],
  })
  async setDateOverrides(
    @CurrentUser('sub') userId: string,
    @Body() dto: SetDateOverridesDto,
  ): Promise<DateOverrideResponseDto[]> {
    const creatorId =
      await this.availabilityService.getCreatorIdFromUserId(userId);
    return this.availabilityService.setDateOverrides(creatorId, dto);
  }

  @Get('overrides')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my date overrides' })
  @ApiResponse({
    status: 200,
    description: 'Date overrides retrieved',
    type: [DateOverrideResponseDto],
  })
  async getMyDateOverrides(
    @CurrentUser('sub') userId: string,
  ): Promise<DateOverrideResponseDto[]> {
    const creatorId =
      await this.availabilityService.getCreatorIdFromUserId(userId);
    return this.availabilityService.getDateOverrides(creatorId);
  }

  @Get('overrides/:creatorId')
  @Public()
  @ApiOperation({ summary: 'Get creator date overrides (public)' })
  @ApiParam({
    name: 'creatorId',
    description: 'Creator profile ID',
    example: 'cc3f5b61-b02e-492d-bc48-06ff3e06d800',
  })
  @ApiResponse({
    status: 200,
    description: 'Date overrides retrieved',
    type: [DateOverrideResponseDto],
  })
  async getCreatorDateOverrides(
    @Param('creatorId') creatorId: string,
  ): Promise<DateOverrideResponseDto[]> {
    return this.availabilityService.getDateOverrides(creatorId);
  }
}
