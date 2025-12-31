import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AgentsService } from './agents.service';
import {
  RagQueryLogService,
  AgentAnalytics,
} from '../rag/rag-query-log.service';
import { RagQueryLog, RagFeedback } from '../rag/entities/rag-query-log.entity';

@ApiTags('Agent Analytics')
@Controller('agents')
export class AgentAnalyticsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly ragQueryLogService: RagQueryLogService,
  ) {}

  @Get(':id/analytics')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get RAG analytics for an agent (Creator only)' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30)',
  })
  @ApiResponse({ status: 200, description: 'Agent analytics' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to view this agent',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentAnalytics(
    @Param('id') agentId: string,
    @CurrentUser() user: User,
    @Query('days') days?: number,
  ): Promise<AgentAnalytics> {
    // Verify user owns this agent (or is admin)
    await this.verifyAgentOwnership(agentId, user);

    return this.ragQueryLogService.getAgentAnalytics(agentId, days || 30);
  }

  @Get(':id/logs')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get RAG query logs for an agent (Creator only)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max logs to return (default: 50)',
  })
  @ApiQuery({
    name: 'outcome',
    required: false,
    enum: ['answered', 'idk'],
    description: 'Filter by outcome',
  })
  @ApiQuery({
    name: 'feedback',
    required: false,
    enum: ['up', 'down'],
    description: 'Filter by feedback',
  })
  @ApiResponse({ status: 200, description: 'Agent query logs' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to view this agent',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentLogs(
    @Param('id') agentId: string,
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
    @Query('outcome') outcome?: 'answered' | 'idk',
    @Query('feedback') feedback?: RagFeedback,
  ): Promise<RagQueryLog[]> {
    await this.verifyAgentOwnership(agentId, user);

    return this.ragQueryLogService.listLogs(
      agentId,
      limit || 50,
      outcome,
      feedback,
    );
  }

  @Post(':id/analytics/reset')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset all analytics data for an agent (Creator only)',
  })
  @ApiResponse({ status: 200, description: 'Analytics reset successfully' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to reset this agent',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async resetAnalytics(
    @Param('id') agentId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; deletedCount: number }> {
    await this.verifyAgentOwnership(agentId, user);
    const result = await this.ragQueryLogService.resetAnalytics(agentId);
    return { success: true, deletedCount: result.deletedCount };
  }

  @Post('logs/:logId/feedback')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit feedback on a RAG query result' })
  @ApiResponse({ status: 200, description: 'Feedback recorded' })
  @ApiResponse({ status: 404, description: 'Log not found' })
  async submitFeedback(
    @Param('logId') logId: string,
    @Body() body: { feedback: RagFeedback; comment?: string },
  ): Promise<{ success: boolean }> {
    const log = await this.ragQueryLogService.getLogById(logId);
    if (!log) {
      throw new NotFoundException('Query log not found');
    }

    await this.ragQueryLogService.setFeedback(
      logId,
      body.feedback,
      body.comment,
    );
    return { success: true };
  }

  /**
   * Verify user owns the agent or is admin
   */
  private async verifyAgentOwnership(
    agentId: string,
    user: User,
  ): Promise<void> {
    const agent = await this.agentsService.findOne(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const isAdmin = user.roles?.includes('admin');
    if (isAdmin) {
      return;
    }

    // Check if user's creator profile owns this agent
    const myAgents = await this.agentsService.findMyAgents(user.id);
    const ownsAgent = myAgents.some((a) => a.id === agentId);

    if (!ownsAgent) {
      throw new ForbiddenException('You do not have access to this agent');
    }
  }
}
