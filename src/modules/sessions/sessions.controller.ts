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
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { BookSessionDto } from './dto/book-session.dto';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('book')
  @ApiOperation({ summary: 'Book a new session with a creator' })
  @ApiResponse({
    status: 201,
    description: 'Session booked successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid booking data' })
  @ApiResponse({ status: 409, description: 'Time slot conflict' })
  async bookSession(
    @CurrentUser('sub') userId: string,
    @Body() dto: BookSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.bookSession(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: "Get current user's sessions" })
  @ApiResponse({
    status: 200,
    description: 'User sessions retrieved',
    type: [SessionResponseDto],
  })
  async getMySessions(
    @CurrentUser('sub') userId: string,
  ): Promise<SessionResponseDto[]> {
    return this.sessionsService.getUserSessions(userId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: "Get user's upcoming sessions" })
  @ApiResponse({
    status: 200,
    description: 'Upcoming sessions retrieved',
    type: [SessionResponseDto],
  })
  async getUpcomingSessions(
    @CurrentUser('sub') userId: string,
  ): Promise<SessionResponseDto[]> {
    return this.sessionsService.getUpcomingSessions(userId);
  }

  @Get('creator/:creatorId')
  @ApiOperation({ summary: "Get creator's sessions (creator only)" })
  @ApiParam({ name: 'creatorId', description: 'Creator ID' })
  @ApiResponse({
    status: 200,
    description: 'Creator sessions retrieved',
    type: [SessionResponseDto],
  })
  async getCreatorSessions(
    @Param('creatorId') creatorId: string,
  ): Promise<SessionResponseDto[]> {
    return this.sessionsService.getCreatorSessions(creatorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details retrieved',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('id') id: string): Promise<SessionResponseDto> {
    return this.sessionsService.getSession(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update session status' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session status updated',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 400, description: 'Invalid status update' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateSessionStatusDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.updateSessionStatus(id, userId, dto);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start session (mark as in progress)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session started',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async startSession(@Param('id') id: string): Promise<SessionResponseDto> {
    return this.sessionsService.startSession(id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark session as completed' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session completed',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async completeSession(@Param('id') id: string): Promise<SessionResponseDto> {
    return this.sessionsService.completeSession(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session cancelled',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async cancelSession(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Query('reason') reason?: string,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.cancelSession(id, userId, reason);
  }
}
