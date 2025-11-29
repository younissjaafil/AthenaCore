import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreatorsRepository } from './repositories/creators.repository';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import { CreatorResponseDto } from './dto/creator-response.dto';
import { Creator } from './entities/creator.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/constants/roles.enum';

@Injectable()
export class CreatorsService {
  constructor(
    private readonly creatorsRepository: CreatorsRepository,
    private readonly usersService: UsersService,
  ) {}

  async create(
    userId: string,
    createCreatorDto: CreateCreatorDto,
  ): Promise<CreatorResponseDto> {
    // Check if user exists
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if creator profile already exists
    const existing = await this.creatorsRepository.findByUserId(userId);
    if (existing) {
      // Return existing creator instead of throwing error
      return this.toResponseDto(existing);
    }

    // Create creator profile with active status for v1
    const creator = await this.creatorsRepository.create({
      userId,
      ...createCreatorDto,
      status: 'active' as any, // Set to active for v1, no approval needed
    });

    // Assign CREATOR role and mark onboarding as complete
    await this.usersService.update(userId, {
      role: UserRole.CREATOR,
      hasCompletedOnboarding: true,
    });

    return this.toResponseDto(creator);
  }

  async findAll(): Promise<CreatorResponseDto[]> {
    const creators = await this.creatorsRepository.findAll();
    return creators.map((creator) => this.toResponseDto(creator));
  }

  async findVerified(): Promise<CreatorResponseDto[]> {
    const creators = await this.creatorsRepository.findVerified();
    return creators.map((creator) => this.toResponseDto(creator));
  }

  async findAvailable(): Promise<CreatorResponseDto[]> {
    const creators = await this.creatorsRepository.findAvailable();
    return creators.map((creator) => this.toResponseDto(creator));
  }

  async findOne(id: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorsRepository.findById(id);
    if (!creator) {
      throw new NotFoundException(`Creator with ID ${id} not found`);
    }
    return this.toResponseDto(creator);
  }

  async findByUserId(userId: string): Promise<CreatorResponseDto | null> {
    const creator = await this.creatorsRepository.findByUserId(userId);
    return creator ? this.toResponseDto(creator) : null;
  }

  async update(
    id: string,
    updateCreatorDto: UpdateCreatorDto,
  ): Promise<CreatorResponseDto> {
    const creator = await this.creatorsRepository.findById(id);
    if (!creator) {
      throw new NotFoundException(`Creator with ID ${id} not found`);
    }

    const updated = await this.creatorsRepository.update(id, updateCreatorDto);
    if (!updated) {
      throw new NotFoundException(`Creator with ID ${id} not found`);
    }

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.creatorsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Creator with ID ${id} not found`);
    }
  }

  toResponseDto(creator: Creator): CreatorResponseDto {
    const response: CreatorResponseDto = {
      id: creator.id,
      userId: creator.userId,
      bio: creator.bio,
      tagline: creator.tagline,
      specialties: creator.specialties,
      categories: creator.categories,
      expertiseLevel: creator.expertiseLevel,
      hourlyRate: Number(creator.hourlyRate),
      minimumBooking: Number(creator.minimumBooking),
      websiteUrl: creator.websiteUrl,
      linkedinUrl: creator.linkedinUrl,
      twitterUrl: creator.twitterUrl,
      githubUrl: creator.githubUrl,
      status: creator.status,
      isAvailable: creator.isAvailable,
      totalAgents: creator.totalAgents,
      totalSessions: creator.totalSessions,
      averageRating: Number(creator.averageRating),
      totalReviews: creator.totalReviews,
      createdAt: creator.createdAt,
      updatedAt: creator.updatedAt,
    };

    if (creator.user) {
      response.user = {
        email: creator.user.email,
        firstName: creator.user.firstName,
        lastName: creator.user.lastName,
        profileImageUrl: creator.user.profileImageUrl,
      };
    }

    return response;
  }
}
