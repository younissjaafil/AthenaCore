import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (creates if not exists)' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  async getMe(@CurrentUser() clerkUser: any): Promise<UserResponseDto> {
    // Find or create user based on Clerk data
    const user = await this.usersService.findOrCreate({
      sub: clerkUser.sub || clerkUser.clerkId,
      email: clerkUser.email,
      username: clerkUser.username,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      profileImageUrl: clerkUser.profileImageUrl || clerkUser.picture,
    });
    return this.usersService.toResponseDto(user);
  }

  @Patch('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated',
    type: UserResponseDto,
  })
  async updateMe(
    @CurrentUser() clerkUser: any,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Find user by clerkId
    const user = await this.usersService.findByClerkIdOrThrow(
      clerkUser.sub || clerkUser.clerkId,
    );

    // Update user
    const updated = await this.usersService.update(user.id, updateUserDto);
    return this.usersService.toResponseDto(updated);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get user public profile by username (public)' })
  @ApiResponse({
    status: 200,
    description: 'User public profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByUsername(
    @Param('username') username: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return this.usersService.toPublicResponseDto(user);
  }
}
