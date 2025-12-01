import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatorsRepository } from './repositories/creators.repository';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import { CreatorResponseDto } from './dto/creator-response.dto';
import { Creator } from './entities/creator.entity';
import { UsersService } from '../users/users.service';
import { UserProfile } from '../profiles/entities/user-profile.entity';

@Injectable()
export class CreatorsService {
  constructor(
    private readonly creatorsRepository: CreatorsRepository,
    private readonly usersService: UsersService,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  /**
   * Enable creator power for a user
   * Creates creator_profile and adds 'creator' role to user
   */
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
      return this.toResponseDto(existing);
    }

    // Create creator profile (auto-approved)
    const creator = await this.creatorsRepository.create({
      userId,
      ...createCreatorDto,
    });

    // Add 'creator' role to user
    await this.usersService.enableCreatorPower(userId);

    return this.toResponseDto(creator);
  }

  /**
   * Disable creator power for a user
   * Removes 'creator' role but keeps creator_profile for data retention
   */
  async disableCreatorPower(userId: string): Promise<void> {
    await this.usersService.disableCreatorPower(userId);
  }

  async findAll(): Promise<CreatorResponseDto[]> {
    const creators = await this.creatorsRepository.findAll();
    return this.enrichCreatorsWithProfiles(creators);
  }

  async findVerified(): Promise<CreatorResponseDto[]> {
    // All creators are auto-verified now, so just return all
    return this.findAll();
  }

  async findAvailable(): Promise<CreatorResponseDto[]> {
    const creators = await this.creatorsRepository.findAvailable();
    return this.enrichCreatorsWithProfiles(creators);
  }

  async findOne(id: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorsRepository.findById(id);
    if (!creator) {
      throw new NotFoundException(`Creator with ID ${id} not found`);
    }
    return this.enrichCreatorWithProfile(creator);
  }

  async findByUserId(userId: string): Promise<CreatorResponseDto | null> {
    const creator = await this.creatorsRepository.findByUserId(userId);
    return creator ? this.enrichCreatorWithProfile(creator) : null;
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
    const creator = await this.creatorsRepository.findById(id);
    if (!creator) {
      throw new NotFoundException(`Creator with ID ${id} not found`);
    }

    // Remove creator role from user
    await this.usersService.disableCreatorPower(creator.userId);

    // Delete creator profile
    await this.creatorsRepository.delete(id);
  }

  toResponseDto(creator: Creator, profile?: UserProfile): CreatorResponseDto {
    const response: CreatorResponseDto = {
      id: creator.id,
      userId: creator.userId,
      title: creator.title,
      bio: creator.bio,
      tagline: creator.tagline,
      specialties: creator.specialties,
      categories: creator.categories,
      expertiseLevel: creator.expertiseLevel,
      hourlyRate: Number(creator.hourlyRate),
      minimumBooking: Number(creator.minimumBooking),
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

    if (profile) {
      response.profile = {
        handle: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
      };
    }

    return response;
  }

  private async getProfileForUser(userId: string): Promise<UserProfile | null> {
    return this.profileRepo.findOne({ where: { userId } });
  }

  private async enrichCreatorWithProfile(
    creator: Creator,
  ): Promise<CreatorResponseDto> {
    const profile = await this.getProfileForUser(creator.userId);
    return this.toResponseDto(creator, profile || undefined);
  }

  private async enrichCreatorsWithProfiles(
    creators: Creator[],
  ): Promise<CreatorResponseDto[]> {
    const userIds = creators.map((c) => c.userId);
    const profiles = await this.profileRepo
      .createQueryBuilder('profile')
      .where('profile.userId IN (:...userIds)', { userIds })
      .getMany();

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return creators.map((creator) =>
      this.toResponseDto(creator, profileMap.get(creator.userId)),
    );
  }
}
