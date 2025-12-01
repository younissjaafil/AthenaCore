import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  SystemStatsDto,
  UserStatsDto,
  CreatorStatsDto,
  AgentStatsDto,
} from './dto/system-stats.dto';
import { AdminActionResponseDto } from './dto/admin-response.dto';
import { UpdateUserRoleDto, DeactivateUserDto } from './dto/update-user.dto';

@ApiTags('Admin')
@Controller('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Check if current user is admin' })
  @ApiResponse({
    status: 200,
    description: 'User is admin',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not admin',
  })
  async checkAdmin(@CurrentUser() user: any): Promise<any> {
    // This will throw if user is not admin
    if (!user.isAdmin) {
      throw new ForbiddenException('Not authorized as admin');
    }
    return {
      isAdmin: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  @Get('stats/system')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get comprehensive system statistics' })
  @ApiResponse({
    status: 200,
    description: 'System statistics retrieved successfully',
    type: SystemStatsDto,
  })
  async getSystemStats(): Promise<SystemStatsDto> {
    return this.adminService.getSystemStats();
  }

  @Get('stats/user/:userId')
  @ApiOperation({ summary: 'Get detailed statistics for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: UserStatsDto,
  })
  async getUserStats(@Param('userId') userId: string): Promise<UserStatsDto> {
    return this.adminService.getUserStats(userId);
  }

  @Get('stats/creator/:creatorId')
  @ApiOperation({
    summary: 'Get detailed statistics for a specific creator',
  })
  @ApiResponse({
    status: 200,
    description: 'Creator statistics retrieved successfully',
    type: CreatorStatsDto,
  })
  async getCreatorStats(
    @Param('creatorId') creatorId: string,
  ): Promise<CreatorStatsDto> {
    return this.adminService.getCreatorStats(creatorId);
  }

  @Get('stats/agent/:agentId')
  @ApiOperation({ summary: 'Get detailed statistics for a specific agent' })
  @ApiResponse({
    status: 200,
    description: 'Agent statistics retrieved successfully',
    type: AgentStatsDto,
  })
  async getAgentStats(
    @Param('agentId') agentId: string,
  ): Promise<AgentStatsDto> {
    return this.adminService.getAgentStats(agentId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getAllUsers(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.getAllUsers(limit, offset);
  }

  @Get('creators')
  @ApiOperation({ summary: 'Get all creators with pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Creators retrieved successfully',
  })
  async getAllCreators(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.getAllCreators(limit, offset);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Get all agents with pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Agents retrieved successfully',
  })
  async getAllAgents(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.getAllAgents(limit, offset);
  }

  @Patch('users/:userId/roles')
  @ApiOperation({ summary: 'Update user roles' })
  @ApiResponse({
    status: 200,
    description: 'User roles updated successfully',
    type: AdminActionResponseDto,
  })
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
  ): Promise<AdminActionResponseDto> {
    const result = await this.adminService.updateUserRoles(
      userId,
      updateRoleDto.roles,
    );
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('users/:userId/deactivate')
  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
    type: AdminActionResponseDto,
  })
  async deactivateUser(
    @Param('userId') userId: string,
    @Body() deactivateDto: DeactivateUserDto,
  ): Promise<AdminActionResponseDto> {
    const result = await this.adminService.deactivateUser(
      userId,
      deactivateDto.reason,
    );
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('users/:userId/reactivate')
  @ApiOperation({ summary: 'Reactivate a deactivated user account' })
  @ApiResponse({
    status: 200,
    description: 'User reactivated successfully',
    type: AdminActionResponseDto,
  })
  async reactivateUser(
    @Param('userId') userId: string,
  ): Promise<AdminActionResponseDto> {
    const result = await this.adminService.reactivateUser(userId);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Delete('agents/:agentId')
  @ApiOperation({ summary: 'Delete an agent (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Agent deleted successfully',
    type: AdminActionResponseDto,
  })
  async deleteAgent(
    @Param('agentId') agentId: string,
  ): Promise<AdminActionResponseDto> {
    const result = await this.adminService.deleteAgent(agentId);
    return {
      success: result.success,
      message: result.message,
    };
  }
}
