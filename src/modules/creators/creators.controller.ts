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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CreatorsService } from './creators.service';
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

@ApiTags('Creators')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

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
  async getMyProfile(
    @CurrentUser() user: User,
  ): Promise<CreatorResponseDto | null> {
    return this.creatorsService.findByUserId(user.id);
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
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete creator (Admin only)' })
  @ApiResponse({ status: 204, description: 'Creator deleted' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.creatorsService.remove(id);
  }
}
