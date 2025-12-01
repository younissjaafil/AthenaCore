import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile, UserFollow, CreatorTestimonial } from './entities';
import { User } from '../users/entities/user.entity';
import { Creator } from '../creators/entities/creator.entity';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileResponseDto,
  CreateTestimonialDto,
  UpdateTestimonialDto,
  TestimonialResponseDto,
  TestimonialsStatsDto,
} from './dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(UserFollow)
    private readonly followRepo: Repository<UserFollow>,
    @InjectRepository(CreatorTestimonial)
    private readonly testimonialRepo: Repository<CreatorTestimonial>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Creator)
    private readonly creatorRepo: Repository<Creator>,
  ) {}

  // ==================== PROFILE METHODS ====================

  /**
   * Check if a string is a valid UUID
   */
  private isUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Get profile by handle (public route)
   * Also supports lookup by userId or username as fallback
   */
  async getProfileByHandle(
    handle: string,
    currentUserId?: string,
  ): Promise<ProfileResponseDto> {
    // First, try to find by handle
    let profile = await this.profileRepo.findOne({
      where: { handle: handle.toLowerCase() },
      relations: ['user'],
    });

    // If not found and looks like a UUID, try to find by userId
    if (!profile && this.isUUID(handle)) {
      profile = await this.profileRepo.findOne({
        where: { userId: handle },
        relations: ['user'],
      });
    }

    // If still not found, try to find by user's username
    if (!profile) {
      const user = await this.userRepo.findOne({
        where: { username: handle.toLowerCase() },
      });
      if (user) {
        profile = await this.profileRepo.findOne({
          where: { userId: user.id },
          relations: ['user'],
        });
      }
    }

    if (!profile) {
      throw new NotFoundException(`Profile @${handle} not found`);
    }

    return this.enrichProfileResponse(profile, currentUserId);
  }

  /**
   * Get profile by user ID
   */
  async getProfileByUserId(
    userId: string,
    currentUserId?: string,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.enrichProfileResponse(profile, currentUserId);
  }

  /**
   * Create profile for a user (usually auto-created via trigger)
   */
  async createProfile(
    userId: string,
    dto: CreateProfileDto,
  ): Promise<ProfileResponseDto> {
    // Check if profile already exists
    const existing = await this.profileRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Profile already exists for this user');
    }

    // Check handle availability
    const handleTaken = await this.profileRepo.findOne({
      where: { handle: dto.handle.toLowerCase() },
    });
    if (handleTaken) {
      throw new ConflictException(`Handle @${dto.handle} is already taken`);
    }

    // Get user info
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = this.profileRepo.create({
      userId,
      handle: dto.handle.toLowerCase(),
      displayName: dto.displayName || user.fullName,
      bio: dto.bio,
      avatarUrl: user.profileImageUrl,
    });

    const saved = await this.profileRepo.save(profile);
    return this.enrichProfileResponse(saved, userId);
  }

  /**
   * Update profile
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check handle availability if changing
    if (dto.handle && dto.handle.toLowerCase() !== profile.handle) {
      const handleTaken = await this.profileRepo.findOne({
        where: { handle: dto.handle.toLowerCase() },
      });
      if (handleTaken) {
        throw new ConflictException(`Handle @${dto.handle} is already taken`);
      }
      profile.handle = dto.handle.toLowerCase();
    }

    // Update other fields
    if (dto.displayName !== undefined) profile.displayName = dto.displayName;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.avatarUrl !== undefined) profile.avatarUrl = dto.avatarUrl;
    if (dto.bannerUrl !== undefined) profile.bannerUrl = dto.bannerUrl;
    if (dto.websiteUrl !== undefined) profile.websiteUrl = dto.websiteUrl;
    if (dto.twitterUrl !== undefined) profile.twitterUrl = dto.twitterUrl;
    if (dto.linkedinUrl !== undefined) profile.linkedinUrl = dto.linkedinUrl;
    if (dto.githubUrl !== undefined) profile.githubUrl = dto.githubUrl;
    if (dto.instagramUrl !== undefined) profile.instagramUrl = dto.instagramUrl;
    if (dto.youtubeUrl !== undefined) profile.youtubeUrl = dto.youtubeUrl;

    const saved = await this.profileRepo.save(profile);
    return this.enrichProfileResponse(saved, userId);
  }

  /**
   * Check if handle is available
   */
  async isHandleAvailable(handle: string): Promise<boolean> {
    const existing = await this.profileRepo.findOne({
      where: { handle: handle.toLowerCase() },
    });
    return !existing;
  }

  /**
   * Check if user is a creator
   */
  async isCreator(userId: string): Promise<boolean> {
    const creator = await this.creatorRepo.findOne({ where: { userId } });
    return !!creator;
  }

  // ==================== FOLLOW METHODS ====================

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if already following
    const existing = await this.followRepo.findOne({
      where: { followerId, followingId },
    });
    if (existing) {
      return; // Already following, no-op
    }

    // Verify both users exist
    const [follower, following] = await Promise.all([
      this.userRepo.findOne({ where: { id: followerId } }),
      this.userRepo.findOne({ where: { id: followingId } }),
    ]);

    if (!follower || !following) {
      throw new NotFoundException('User not found');
    }

    await this.followRepo.save({ followerId, followingId });
    // Note: Trigger handles count updates
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const result = await this.followRepo.delete({ followerId, followingId });
    if (result.affected === 0) {
      throw new NotFoundException('Follow relationship not found');
    }
    // Note: Trigger handles count updates
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const existing = await this.followRepo.findOne({
      where: { followerId, followingId },
    });
    return !!existing;
  }

  /**
   * Get followers of a user
   */
  async getFollowers(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ profiles: ProfileResponseDto[]; total: number }> {
    const [follows, total] = await this.followRepo.findAndCount({
      where: { followingId: userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const profiles = await Promise.all(
      follows.map(async (f) => {
        const profile = await this.profileRepo.findOne({
          where: { userId: f.followerId },
        });
        return profile ? this.enrichProfileResponse(profile, userId) : null;
      }),
    );

    return {
      profiles: profiles.filter((p) => p !== null) as ProfileResponseDto[],
      total,
    };
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ profiles: ProfileResponseDto[]; total: number }> {
    const [follows, total] = await this.followRepo.findAndCount({
      where: { followerId: userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const profiles = await Promise.all(
      follows.map(async (f) => {
        const profile = await this.profileRepo.findOne({
          where: { userId: f.followingId },
        });
        return profile ? this.enrichProfileResponse(profile, userId) : null;
      }),
    );

    return {
      profiles: profiles.filter((p) => p !== null) as ProfileResponseDto[],
      total,
    };
  }

  // ==================== TESTIMONIAL METHODS ====================

  /**
   * Create testimonial for a creator
   */
  async createTestimonial(
    creatorId: string,
    authorUserId: string,
    dto: CreateTestimonialDto,
  ): Promise<TestimonialResponseDto> {
    // Verify creator exists
    const creator = await this.creatorRepo.findOne({
      where: { id: creatorId },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Can't review yourself
    if (creator.userId === authorUserId) {
      throw new BadRequestException('Cannot write testimonial for yourself');
    }

    // Check if already reviewed
    const existing = await this.testimonialRepo.findOne({
      where: { creatorId, authorUserId },
    });
    if (existing) {
      throw new ConflictException(
        'You have already written a testimonial for this creator',
      );
    }

    const testimonial = this.testimonialRepo.create({
      creatorId,
      authorUserId,
      rating: dto.rating,
      text: dto.text,
    });

    const saved = await this.testimonialRepo.save(testimonial);
    await this.updateCreatorRating(creatorId);

    return this.enrichTestimonialResponse(saved);
  }

  /**
   * Update testimonial
   */
  async updateTestimonial(
    testimonialId: string,
    authorUserId: string,
    dto: UpdateTestimonialDto,
  ): Promise<TestimonialResponseDto> {
    const testimonial = await this.testimonialRepo.findOne({
      where: { id: testimonialId, authorUserId },
    });

    if (!testimonial) {
      throw new NotFoundException('Testimonial not found or not yours');
    }

    if (dto.rating !== undefined) testimonial.rating = dto.rating;
    if (dto.text !== undefined) testimonial.text = dto.text;

    const saved = await this.testimonialRepo.save(testimonial);
    await this.updateCreatorRating(testimonial.creatorId);

    return this.enrichTestimonialResponse(saved);
  }

  /**
   * Delete testimonial
   */
  async deleteTestimonial(
    testimonialId: string,
    authorUserId: string,
  ): Promise<void> {
    const testimonial = await this.testimonialRepo.findOne({
      where: { id: testimonialId, authorUserId },
    });

    if (!testimonial) {
      throw new NotFoundException('Testimonial not found or not yours');
    }

    const creatorId = testimonial.creatorId;
    await this.testimonialRepo.delete(testimonialId);
    await this.updateCreatorRating(creatorId);
  }

  /**
   * Get testimonials for a creator
   */
  async getCreatorTestimonials(
    creatorId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ testimonials: TestimonialResponseDto[]; total: number }> {
    const [testimonials, total] = await this.testimonialRepo.findAndCount({
      where: { creatorId, isVisible: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { isFeatured: 'DESC', createdAt: 'DESC' },
    });

    const enriched = await Promise.all(
      testimonials.map((t) => this.enrichTestimonialResponse(t)),
    );

    return { testimonials: enriched, total };
  }

  /**
   * Get testimonial stats for a creator
   */
  async getTestimonialStats(creatorId: string): Promise<TestimonialsStatsDto> {
    const testimonials = await this.testimonialRepo.find({
      where: { creatorId, isVisible: true },
      select: ['rating'],
    });

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let sum = 0;

    testimonials.forEach((t) => {
      distribution[t.rating] = (distribution[t.rating] || 0) + 1;
      sum += t.rating;
    });

    return {
      averageRating: testimonials.length > 0 ? sum / testimonials.length : 0,
      totalCount: testimonials.length,
      distribution,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Enrich profile response with creator stats if applicable
   */
  private async enrichProfileResponse(
    profile: UserProfile,
    currentUserId?: string,
  ): Promise<ProfileResponseDto> {
    const response: ProfileResponseDto = {
      id: profile.id,
      userId: profile.userId,
      handle: profile.handle,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      rankScore: profile.rankScore,
      websiteUrl: profile.websiteUrl,
      twitterUrl: profile.twitterUrl,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      instagramUrl: profile.instagramUrl,
      youtubeUrl: profile.youtubeUrl,
      isVerified: profile.isVerified,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      createdAt: profile.createdAt,
    };

    // Check if current user is following this profile
    if (currentUserId && currentUserId !== profile.userId) {
      response.isFollowing = await this.isFollowing(
        currentUserId,
        profile.userId,
      );
    }

    // Get creator info if exists
    const creator = await this.creatorRepo.findOne({
      where: { userId: profile.userId },
    });

    if (creator) {
      response.creatorId = creator.id;
      response.averageRating = Number(creator.averageRating) || 0;

      // Get counts (could optimize with a single query)
      const [agentCount, sessionCount] = await Promise.all([
        this.creatorRepo.manager
          .getRepository('agent')
          .count({ where: { creatorId: creator.id } }),
        this.creatorRepo.manager
          .getRepository('session')
          .count({ where: { creatorId: creator.id } }),
      ]);

      response.agentCount = agentCount;
      response.sessionCount = sessionCount;
      // Note: document count would need a join through agents
    }

    return response;
  }

  /**
   * Enrich testimonial response with author info
   */
  private async enrichTestimonialResponse(
    testimonial: CreatorTestimonial,
  ): Promise<TestimonialResponseDto> {
    const profile = await this.profileRepo.findOne({
      where: { userId: testimonial.authorUserId },
    });

    return {
      id: testimonial.id,
      creatorId: testimonial.creatorId,
      authorUserId: testimonial.authorUserId,
      rating: testimonial.rating,
      text: testimonial.text,
      isFeatured: testimonial.isFeatured,
      createdAt: testimonial.createdAt,
      author: profile
        ? {
            id: profile.userId,
            displayName: profile.displayName || 'Anonymous',
            avatarUrl: profile.avatarUrl,
            handle: profile.handle,
          }
        : undefined,
    };
  }

  /**
   * Update creator's average rating
   */
  private async updateCreatorRating(creatorId: string): Promise<void> {
    const stats = await this.getTestimonialStats(creatorId);
    await this.creatorRepo.update(creatorId, {
      averageRating: stats.averageRating,
      totalReviews: stats.totalCount,
    });
  }
}
