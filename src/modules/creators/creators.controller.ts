import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CreatorsService } from './creators.service';
import { CreatorFollowService } from './creator-follow.service';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import { CreatorResponseDto } from './dto/creator-response.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/roles.enum';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { AgentsService } from '../agents/agents.service';
import { DocumentsService } from '../documents/documents.service';
import { AvailabilityService } from '../sessions/availability.service';
import { AgentResponseDto } from '../agents/dto/agent-response.dto';
import { DocumentResponseDto } from '../documents/dto/document-response.dto';
import { SessionSettingsResponseDto } from '../sessions/dto/session-settings.dto';

@ApiTags('Creators')
@Controller('creators')
export class CreatorsController {
  constructor(
    private readonly creatorsService: CreatorsService,
    private readonly followService: CreatorFollowService,
    private readonly agentsService: AgentsService,
    private readonly documentsService: DocumentsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user creator profile' })
  @ApiResponse({
    status: 200,
    description: 'Creator profile retrieved',
    type: CreatorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creator profile not found' })
  async getMyProfile(@CurrentUser() user: User): Promise<CreatorResponseDto> {
    const creator = await this.creatorsService.findByUserId(user.id);
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }
    return creator;
  }

  @Get('me/following')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creators that current user is following' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMyFollowingCreators(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.followService.getFollowingCreators(user.id, page, limit);
  }

  @Get('me/stats')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current creator stats' })
  async getMyStats(@CurrentUser() user: User) {
    const creator = await this.creatorsService.findByUserId(user.id);
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }
    return this.followService.getCreatorStats(creator.id);
  }

  @Delete('me/power')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable creator power (remove creator role)' })
  @ApiResponse({ status: 204, description: 'Creator power disabled' })
  async disableCreatorPower(@CurrentUser() user: User): Promise<void> {
    await this.creatorsService.disableCreatorPower(user.id);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create creator profile (idempotent)' })
  @ApiResponse({
    status: 201,
    description: 'Creator profile created or retrieved',
    type: CreatorResponseDto,
  })
  async create(
    @CurrentUser() user: User,
    @Body() createCreatorDto: CreateCreatorDto,
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.create(user.id, createCreatorDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all verified creators' })
  @ApiResponse({
    status: 200,
    description: 'List of verified creators',
    type: [CreatorResponseDto],
  })
  async findAll(): Promise<CreatorResponseDto[]> {
    return this.creatorsService.findVerified();
  }

  @Get('available')
  @Public()
  @ApiOperation({ summary: 'Get all available creators' })
  @ApiResponse({
    status: 200,
    description: 'List of available creators',
    type: [CreatorResponseDto],
  })
  async findAvailable(): Promise<CreatorResponseDto[]> {
    return this.creatorsService.findAvailable();
  }

  @Get('top/ranked')
  @Public()
  @ApiOperation({ summary: 'Get top ranked creators' })
  @ApiQuery({ name: 'limit', required: false })
  async getTopCreators(@Query('limit') limit: number = 10) {
    return this.followService.getTopCreators(limit);
  }

  @Get(':id/is-following')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is following a creator' })
  @ApiResponse({ status: 200, description: 'Following status' })
  async isFollowing(
    @CurrentUser() user: User,
    @Param('id') creatorId: string,
  ): Promise<{ isFollowing: boolean }> {
    const isFollowing = await this.followService.isFollowing(
      user.id,
      creatorId,
    );
    return { isFollowing };
  }

  @Get(':id/followers-count')
  @Public()
  @ApiOperation({ summary: 'Get followers count for a creator' })
  @ApiResponse({ status: 200, description: 'Followers count' })
  async getFollowersCount(
    @Param('id') creatorId: string,
  ): Promise<{ count: number }> {
    const count = await this.followService.getFollowersCount(creatorId);
    return { count };
  }

  @Get(':id/stats')
  @Public()
  @ApiOperation({ summary: 'Get creator stats' })
  @ApiResponse({ status: 200, description: 'Creator stats' })
  async getCreatorStats(@Param('id') creatorId: string) {
    const stats = await this.followService.getCreatorStats(creatorId);
    if (!stats) {
      // Return empty stats if not found
      return {
        followersCount: 0,
        rankScore: 0,
        rankPosition: 0,
        totalSessions: 0,
        averageRating: 0,
      };
    }
    return stats;
  }

  @Get(':id/followers')
  @Public()
  @ApiOperation({ summary: 'Get followers list for a creator' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getCreatorFollowers(
    @Param('id') creatorId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.followService.getCreatorFollowers(creatorId, page, limit);
  }

  @Get(':id/agents')
  @Public()
  @ApiOperation({
    summary: 'Get public agents for a creator',
  })
  @ApiQuery({ name: 'visibility', required: false, enum: ['public', 'all'] })
  @ApiResponse({
    status: 200,
    description: 'List of agents',
    type: [AgentResponseDto],
  })
  async getCreatorAgents(
    @Param('id') creatorId: string,
    @Query('visibility') visibility: 'public' | 'all' = 'public',
  ): Promise<AgentResponseDto[]> {
    return this.agentsService.findByCreatorWithVisibility(
      creatorId,
      visibility,
    );
  }

  @Get(':id/documents')
  @Public()
  @ApiOperation({
    summary: 'Get public documents for a creator',
  })
  @ApiQuery({ name: 'visibility', required: false, enum: ['public', 'all'] })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
    type: [DocumentResponseDto],
  })
  async getCreatorDocuments(
    @Param('id') creatorId: string,
    @Query('visibility') visibility: 'public' | 'all' = 'public',
  ): Promise<DocumentResponseDto[]> {
    return this.documentsService.findByCreatorWithVisibility(
      creatorId,
      visibility,
    );
  }

  @Get(':id/sessions/settings')
  @Public()
  @ApiOperation({ summary: 'Get session settings for a creator' })
  @ApiResponse({
    status: 200,
    description: 'Session settings',
    type: SessionSettingsResponseDto,
  })
  async getCreatorSessionSettings(
    @Param('id') creatorId: string,
  ): Promise<SessionSettingsResponseDto> {
    return this.availabilityService.getSessionSettings(creatorId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get creator by ID' })
  @ApiResponse({
    status: 200,
    description: 'Creator found',
    type: CreatorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async findOne(@Param('id') id: string): Promise<CreatorResponseDto> {
    return this.creatorsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update creator profile' })
  @ApiResponse({
    status: 200,
    description: 'Creator updated',
    type: CreatorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCreatorDto: UpdateCreatorDto,
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.update(id, updateCreatorDto);
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete creator (Admin only)' })
  @ApiResponse({ status: 204, description: 'Creator deleted' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.creatorsService.remove(id);
  }

  // ==================== FOLLOW ENDPOINTS ====================

  @Post(':id/follow')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Follow a creator' })
  @ApiResponse({ status: 204, description: 'Successfully followed' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async followCreator(
    @CurrentUser() user: User,
    @Param('id') creatorId: string,
  ): Promise<void> {
    await this.followService.followCreator(user.id, creatorId);
  }

  @Delete(':id/follow')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unfollow a creator' })
  @ApiResponse({ status: 204, description: 'Successfully unfollowed' })
  @ApiResponse({ status: 404, description: 'Follow relationship not found' })
  async unfollowCreator(
    @CurrentUser() user: User,
    @Param('id') creatorId: string,
  ): Promise<void> {
    await this.followService.unfollowCreator(user.id, creatorId);
  }
}
