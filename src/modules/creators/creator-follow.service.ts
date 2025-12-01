import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreatorFollow } from './entities/creator-follow.entity';
import { CreatorStats } from './entities/creator-stats.entity';
import { Creator } from './entities/creator.entity';
import { User } from '../users/entities/user.entity';

export interface CreatorWithStats {
  creator: Creator;
  stats: CreatorStats;
  isFollowing?: boolean;
}

export interface FollowersListDto {
  followers: {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    followedAt: Date;
  }[];
  total: number;
}

@Injectable()
export class CreatorFollowService {
  private readonly logger = new Logger(CreatorFollowService.name);

  constructor(
    @InjectRepository(CreatorFollow)
    private readonly followRepo: Repository<CreatorFollow>,
    @InjectRepository(CreatorStats)
    private readonly statsRepo: Repository<CreatorStats>,
    @InjectRepository(Creator)
    private readonly creatorRepo: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Follow a creator
   */
  async followCreator(userId: string, creatorId: string): Promise<void> {
    // Verify creator exists
    const creator = await this.creatorRepo.findOne({
      where: { id: creatorId },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Can't follow yourself
    if (creator.userId === userId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if already following
    const existing = await this.followRepo.findOne({
      where: { followerUserId: userId, creatorId },
    });
    if (existing) {
      return; // Already following, no-op
    }

    // Create follow (trigger will update stats)
    await this.followRepo.save({
      followerUserId: userId,
      creatorId,
    });

    this.logger.log(`User ${userId} followed creator ${creatorId}`);
  }

  /**
   * Unfollow a creator
   */
  async unfollowCreator(userId: string, creatorId: string): Promise<void> {
    const result = await this.followRepo.delete({
      followerUserId: userId,
      creatorId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Follow relationship not found');
    }

    this.logger.log(`User ${userId} unfollowed creator ${creatorId}`);
  }

  /**
   * Check if user is following a creator
   */
  async isFollowing(userId: string, creatorId: string): Promise<boolean> {
    const follow = await this.followRepo.findOne({
      where: { followerUserId: userId, creatorId },
    });
    return !!follow;
  }

  /**
   * Get followers count for a creator
   */
  async getFollowersCount(creatorId: string): Promise<number> {
    const stats = await this.statsRepo.findOne({ where: { creatorId } });
    return stats?.followersCount || 0;
  }

  /**
   * Get creator stats
   */
  async getCreatorStats(creatorId: string): Promise<CreatorStats | null> {
    return this.statsRepo.findOne({ where: { creatorId } });
  }

  /**
   * Get creators that a user is following
   */
  async getFollowingCreators(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ creators: CreatorWithStats[]; total: number }> {
    const [follows, total] = await this.followRepo.findAndCount({
      where: { followerUserId: userId },
      relations: ['creator', 'creator.user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const creators = await Promise.all(
      follows.map(async (f) => {
        const stats = await this.statsRepo.findOne({
          where: { creatorId: f.creatorId },
        });
        return {
          creator: f.creator,
          stats: stats || ({} as CreatorStats),
          isFollowing: true,
        };
      }),
    );

    return { creators, total };
  }

  /**
   * Get followers list for a creator
   */
  async getCreatorFollowers(
    creatorId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<FollowersListDto> {
    const [follows, total] = await this.followRepo.findAndCount({
      where: { creatorId },
      relations: ['follower'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      followers: follows.map((f) => ({
        id: f.id,
        userId: f.followerUserId,
        firstName: f.follower?.firstName,
        lastName: f.follower?.lastName,
        profileImageUrl: f.follower?.profileImageUrl,
        followedAt: f.createdAt,
      })),
      total,
    };
  }

  /**
   * Get top creators by rank
   */
  async getTopCreators(limit: number = 10): Promise<CreatorWithStats[]> {
    const stats = await this.statsRepo.find({
      relations: ['creator', 'creator.user'],
      order: { rankScore: 'DESC' },
      take: limit,
    });

    return stats.map((s) => ({
      creator: s.creator,
      stats: s,
    }));
  }

  /**
   * Manually refresh stats for a creator (called after transactions, sessions, etc.)
   */
  async refreshCreatorStats(creatorId: string): Promise<void> {
    await this.dataSource.query('SELECT refresh_creator_stats($1)', [
      creatorId,
    ]);
  }

  /**
   * Refresh all creator stats and ranks (for cron job)
   */
  async refreshAllStats(): Promise<void> {
    await this.dataSource.query('SELECT refresh_all_creator_stats()');
    this.logger.log('Refreshed all creator stats');
  }

  /**
   * Ensure stats record exists for a creator
   */
  async ensureStatsExist(creatorId: string): Promise<CreatorStats> {
    let stats = await this.statsRepo.findOne({ where: { creatorId } });
    if (!stats) {
      stats = await this.statsRepo.save({ creatorId });
    }
    return stats;
  }
}
