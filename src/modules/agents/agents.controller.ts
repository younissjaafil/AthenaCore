import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/roles.enum';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('creator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new agent (Creator only)' })
  @ApiResponse({
    status: 201,
    description: 'Agent created',
    type: AgentResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User must have creator profile',
  })
  async create(
    @CurrentUser() user: User,
    @Body() createAgentDto: CreateAgentDto,
  ): Promise<AgentResponseDto> {
    return this.agentsService.create(user.id, createAgentDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all public agents' })
  @ApiResponse({
    status: 200,
    description: 'List of public agents',
    type: [AgentResponseDto],
  })
  async findAll(): Promise<AgentResponseDto[]> {
    return this.agentsService.findAll();
  }

  @Get('free')
  @Public()
  @ApiOperation({ summary: 'Get all free agents' })
  @ApiResponse({
    status: 200,
    description: 'List of free agents',
    type: [AgentResponseDto],
  })
  async findFree(): Promise<AgentResponseDto[]> {
    return this.agentsService.findFree();
  }

  @Get('my-agents')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('creator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my agents (Creator only)' })
  @ApiResponse({
    status: 200,
    description: 'List of my agents',
    type: [AgentResponseDto],
  })
  async getMyAgents(@CurrentUser() user: User): Promise<AgentResponseDto[]> {
    return this.agentsService.findMyAgents(user.id);
  }

  @Get('category/:category')
  @Public()
  @ApiOperation({ summary: 'Get agents by category' })
  @ApiResponse({
    status: 200,
    description: 'List of agents in category',
    type: [AgentResponseDto],
  })
  async findByCategory(
    @Param('category') category: string,
  ): Promise<AgentResponseDto[]> {
    return this.agentsService.findByCategory(category);
  }

  @Get('creator/:creatorId')
  @Public()
  @ApiOperation({ summary: 'Get agents by creator' })
  @ApiResponse({
    status: 200,
    description: "List of creator's public agents",
    type: [AgentResponseDto],
  })
  async findByCreator(
    @Param('creatorId') creatorId: string,
  ): Promise<AgentResponseDto[]> {
    return this.agentsService.findByCreator(creatorId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({
    status: 200,
    description: 'Agent found',
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async findOne(@Param('id') id: string): Promise<AgentResponseDto> {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('creator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agent (Creator only - own agents)' })
  @ApiResponse({
    status: 200,
    description: 'Agent updated',
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({
    status: 403,
    description: 'Can only update own agents',
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateAgentDto: UpdateAgentDto,
  ): Promise<AgentResponseDto> {
    return this.agentsService.update(id, user.id, updateAgentDto);
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('creator', 'admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete agent (Creator/Admin)' })
  @ApiResponse({ status: 204, description: 'Agent deleted' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({
    status: 403,
    description: 'Can only delete own agents',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.agentsService.remove(id, user.id);
  }
}
