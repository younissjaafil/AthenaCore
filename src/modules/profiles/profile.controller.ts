import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileResponseDto,
  CreateTestimonialDto,
  UpdateTestimonialDto,
  TestimonialResponseDto,
  TestimonialsStatsDto,
} from './dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Profiles')
@Controller('profiles')
@UseGuards(ClerkAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ==================== AUTHENTICATED PROFILE ROUTES ====================
  // Note: These MUST come before parameterized routes to avoid /me being matched as /:handle

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getMyProfile(
    @CurrentUser('id') userId: string,
  ): Promise<ProfileResponseDto> {
    return this.profileService.getProfileByUserId(userId, userId);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create my profile' })
  @ApiResponse({ status: 201, type: ProfileResponseDto })
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.createProfile(userId, dto);
  }

  @Patch('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(userId, dto);
  }

  // ==================== PUBLIC PROFILE ROUTES ====================

  @Public()
  @Get('handle/:handle')
  @ApiOperation({ summary: 'Get profile by handle (public)' })
  @ApiParam({ name: 'handle', description: 'Profile handle (e.g., johndoe)' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getProfileByHandle(
    @Param('handle') handle: string,
  ): Promise<ProfileResponseDto> {
    return this.profileService.getProfileByHandle(handle);
  }

  @Public()
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get profile by user ID (public)' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getProfileByUserId(
    @Param('userId') userId: string,
  ): Promise<ProfileResponseDto> {
    return this.profileService.getProfileByUserId(userId);
  }

  @Public()
  @Get('check-handle/:handle')
  @ApiOperation({ summary: 'Check if handle is available' })
  async checkHandle(
    @Param('handle') handle: string,
  ): Promise<{ available: boolean }> {
    const available = await this.profileService.isHandleAvailable(handle);
    return { available };
  }

  // ==================== FOLLOW ROUTES ====================

  @Post(':userId/follow')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Follow a user' })
  async followUser(
    @CurrentUser('id') followerId: string,
    @Param('userId') followingId: string,
  ): Promise<void> {
    return this.profileService.followUser(followerId, followingId);
  }

  @Delete(':userId/follow')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unfollow a user' })
  async unfollowUser(
    @CurrentUser('id') followerId: string,
    @Param('userId') followingId: string,
  ): Promise<void> {
    return this.profileService.unfollowUser(followerId, followingId);
  }

  @Public()
  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<{ profiles: ProfileResponseDto[]; total: number }> {
    return this.profileService.getFollowers(userId, page, limit);
  }

  @Public()
  @Get(':userId/following')
  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<{ profiles: ProfileResponseDto[]; total: number }> {
    return this.profileService.getFollowing(userId, page, limit);
  }
}

// ==================== TESTIMONIALS CONTROLLER ====================

@ApiTags('Testimonials')
@Controller('creators/:creatorId/testimonials')
export class TestimonialsController {
  constructor(private readonly profileService: ProfileService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get testimonials for a creator' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTestimonials(
    @Param('creatorId') creatorId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ testimonials: TestimonialResponseDto[]; total: number }> {
    return this.profileService.getCreatorTestimonials(creatorId, page, limit);
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get testimonial statistics for a creator' })
  async getStats(
    @Param('creatorId') creatorId: string,
  ): Promise<TestimonialsStatsDto> {
    return this.profileService.getTestimonialStats(creatorId);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a testimonial for a creator' })
  @ApiResponse({ status: 201, type: TestimonialResponseDto })
  async createTestimonial(
    @Param('creatorId') creatorId: string,
    @CurrentUser('id') authorUserId: string,
    @Body() dto: CreateTestimonialDto,
  ): Promise<TestimonialResponseDto> {
    return this.profileService.createTestimonial(creatorId, authorUserId, dto);
  }

  @Patch(':testimonialId')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my testimonial' })
  async updateTestimonial(
    @Param('testimonialId') testimonialId: string,
    @CurrentUser('id') authorUserId: string,
    @Body() dto: UpdateTestimonialDto,
  ): Promise<TestimonialResponseDto> {
    return this.profileService.updateTestimonial(
      testimonialId,
      authorUserId,
      dto,
    );
  }

  @Delete(':testimonialId')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete my testimonial' })
  async deleteTestimonial(
    @Param('testimonialId') testimonialId: string,
    @CurrentUser('id') authorUserId: string,
  ): Promise<void> {
    return this.profileService.deleteTestimonial(testimonialId, authorUserId);
  }
}
