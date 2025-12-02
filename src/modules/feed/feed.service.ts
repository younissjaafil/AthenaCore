import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FeedRepository } from './repositories/feed.repository';
import { CreatorsService } from '../creators/creators.service';
import { CreateCreatorDto } from '../creators/dto/create-creator.dto';
import { CreatorResponseDto } from '../creators/dto/creator-response.dto';
import { CreatorFollowService } from '../creators/creator-follow.service';
import {
  CreatePostDto,
  UpdatePostDto,
  PostResponseDto,
  FeedResponseDto,
  CreateCommentDto,
  UpdateCommentDto,
  CommentResponseDto,
  CommentsResponseDto,
} from './dto';
import { Post, PostVisibility } from './entities/post.entity';
import { PostComment } from './entities/post-comment.entity';
import { UserProfile } from '../profiles/entities/user-profile.entity';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly creatorsService: CreatorsService,
    private readonly followService: CreatorFollowService,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  // ==================== POSTS ====================

  async createPost(
    userId: string,
    dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    const creator = await this.ensureCreatorProfile(userId);

    // Create post
    const post = await this.feedRepository.createPost(creator.id, {
      title: dto.title,
      body: dto.body,
      visibility: dto.visibility || PostVisibility.PUBLIC,
    });

    // Add media if provided
    if (dto.media && dto.media.length > 0) {
      await this.feedRepository.addMedia(post.id, dto.media);
    }

    // Fetch full post with relations
    const fullPost = await this.feedRepository.findPostById(post.id);
    if (!fullPost) {
      throw new NotFoundException('Post creation failed');
    }

    this.logger.log(`Created post ${post.id} for creator ${creator.id}`);

    // Get profile data
    const profile = await this.profileRepo.findOne({
      where: { userId },
    });

    return this.mapPostToResponse(fullPost, false, profile || undefined);
  }

  async updatePost(
    userId: string,
    postId: string,
    dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Verify ownership
    const creator = await this.creatorsService.findByUserId(userId);
    if (!creator || post.creatorId !== creator.id) {
      throw new ForbiddenException('You do not own this post');
    }

    const updatedPost = await this.feedRepository.updatePost(postId, dto);
    if (!updatedPost) {
      throw new NotFoundException('Post update failed');
    }

    // Get profile data
    const profile = await this.profileRepo.findOne({
      where: { userId },
    });

    return this.mapPostToResponse(updatedPost, false, profile || undefined);
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Verify ownership
    const creator = await this.creatorsService.findByUserId(userId);
    if (!creator || post.creatorId !== creator.id) {
      throw new ForbiddenException('You do not own this post');
    }

    await this.feedRepository.deletePost(postId);
    this.logger.log(`Deleted post ${postId}`);
  }

  async getPost(postId: string, userId?: string): Promise<PostResponseDto> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check visibility
    await this.checkPostVisibility(post, userId);

    // Increment view count
    await this.feedRepository.incrementViewCount(postId);

    // Check if user liked
    const isLiked = userId
      ? await this.feedRepository.hasUserLikedPost(postId, userId)
      : false;

    // Get profile data if post has a creator
    let profile: UserProfile | undefined;
    if (post.creator) {
      const foundProfile = await this.profileRepo.findOne({
        where: { userId: post.creator.userId },
      });
      profile = foundProfile || undefined;
    }

    return this.mapPostToResponse(post, isLiked, profile);
  }

  async getCreatorPosts(
    creatorId: string,
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ): Promise<FeedResponseDto> {
    // If viewer is the creator, show all posts
    let includeNonPublic = false;
    if (userId) {
      const creator = await this.creatorsService.findByUserId(userId);
      includeNonPublic = creator?.id === creatorId;
    }

    const { posts, total } = await this.feedRepository.findCreatorPosts(
      creatorId,
      page,
      limit,
      includeNonPublic,
    );

    // Get liked status for all posts
    const postIds = posts.map((p) => p.id);
    const likedPostIds = userId
      ? await this.feedRepository.getUserLikedPostIds(postIds, userId)
      : [];

    // Get profile data for posts
    const profileMap = await this.getProfilesForPosts(posts);

    return {
      posts: posts.map((post) =>
        this.mapPostToResponse(
          post,
          likedPostIds.includes(post.id),
          profileMap.get(post.creator.userId),
        ),
      ),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async getHomeFeed(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<FeedResponseDto> {
    // Get creators user follows
    const followedCreators = await this.followService.getFollowingCreators(
      userId,
      1,
      1000, // Get all followed creators
    );
    const followedCreatorIds = followedCreators.creators.map(
      (c) => c.creator.id,
    );

    // TODO: Get subscribed creators when subscription system is implemented
    const subscribedCreatorIds: string[] = [];

    const { posts, total } = await this.feedRepository.findFeedForUser(
      userId,
      followedCreatorIds,
      subscribedCreatorIds,
      page,
      limit,
    );

    // Get liked status
    const postIds = posts.map((p) => p.id);
    const likedPostIds = await this.feedRepository.getUserLikedPostIds(
      postIds,
      userId,
    );

    // Get profile data for posts
    const profileMap = await this.getProfilesForPosts(posts);

    const postsWithCreators = posts.filter((post) => post.creator !== null);

    return {
      posts: postsWithCreators.map((post) =>
        this.mapPostToResponse(
          post,
          likedPostIds.includes(post.id),
          profileMap.get(post.creator!.userId),
        ),
      ),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async getDiscoverFeed(
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ): Promise<FeedResponseDto> {
    // Exclude creators user already follows
    let excludeCreatorIds: string[] = [];
    if (userId) {
      const followedCreators = await this.followService.getFollowingCreators(
        userId,
        1,
        1000,
      );
      excludeCreatorIds = followedCreators.creators.map((c) => c.creator.id);
    }

    const { posts, total } = await this.feedRepository.findDiscoverFeed(
      page,
      limit,
      excludeCreatorIds,
    );

    // Get liked status
    const postIds = posts.map((p) => p.id);
    const likedPostIds = userId
      ? await this.feedRepository.getUserLikedPostIds(postIds, userId)
      : [];

    // Get profile data for posts
    const profileMap = await this.getProfilesForPosts(posts);

    const postsWithCreators = posts.filter((post) => post.creator !== null);

    return {
      posts: postsWithCreators.map((post) =>
        this.mapPostToResponse(
          post,
          likedPostIds.includes(post.id),
          profileMap.get(post.creator!.userId),
        ),
      ),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  // ==================== LIKES ====================

  async likePost(userId: string, postId: string): Promise<void> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.checkPostVisibility(post, userId);
    await this.feedRepository.likePost(postId, userId);
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    await this.feedRepository.unlikePost(postId, userId);
  }

  // ==================== COMMENTS ====================

  async createComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.checkPostVisibility(post, userId);

    // If replying, verify parent comment exists
    if (dto.parentId) {
      const parent = await this.feedRepository.findCommentById(dto.parentId);
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.feedRepository.createComment(
      postId,
      userId,
      dto.content,
      dto.parentId,
    );

    const fullComment = await this.feedRepository.findCommentById(comment.id);
    if (!fullComment) {
      throw new NotFoundException('Comment creation failed');
    }

    return this.mapCommentToResponse(fullComment, false, 0);
  }

  async updateComment(
    userId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.feedRepository.findCommentById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You do not own this comment');
    }

    const updated = await this.feedRepository.updateComment(
      commentId,
      dto.content,
    );
    if (!updated) {
      throw new NotFoundException('Comment update failed');
    }

    const repliesCount = await this.feedRepository.countReplies(commentId);
    return this.mapCommentToResponse(updated, false, repliesCount);
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.feedRepository.findCommentById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Allow comment owner or post creator to delete
    const post = await this.feedRepository.findPostById(comment.postId);
    const creator = await this.creatorsService.findByUserId(userId);

    if (comment.userId !== userId && post?.creatorId !== creator?.id) {
      throw new ForbiddenException('You cannot delete this comment');
    }

    await this.feedRepository.deleteComment(commentId);
  }

  async getPostComments(
    postId: string,
    page: number = 1,
    limit: number = 20,
    userId?: string,
    parentId?: string,
  ): Promise<CommentsResponseDto> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (userId) {
      await this.checkPostVisibility(post, userId);
    } else if (post.visibility !== PostVisibility.PUBLIC) {
      throw new ForbiddenException('Post not accessible');
    }

    const { comments, total } = await this.feedRepository.findPostComments(
      postId,
      page,
      limit,
      parentId,
    );

    // Get liked status and reply counts
    const commentIds = comments.map((c) => c.id);
    const likedCommentIds = userId
      ? await this.feedRepository.getUserLikedCommentIds(commentIds, userId)
      : [];

    const replyCounts = await Promise.all(
      commentIds.map((id) => this.feedRepository.countReplies(id)),
    );

    return {
      comments: comments.map((comment, index) =>
        this.mapCommentToResponse(
          comment,
          likedCommentIds.includes(comment.id),
          replyCounts[index],
        ),
      ),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async likeComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.feedRepository.findCommentById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.feedRepository.likeComment(commentId, userId);
  }

  async unlikeComment(userId: string, commentId: string): Promise<void> {
    await this.feedRepository.unlikeComment(commentId, userId);
  }

  // ==================== HELPERS ====================

  private async checkPostVisibility(
    post: Post,
    userId?: string,
  ): Promise<void> {
    if (post.visibility === PostVisibility.PUBLIC) {
      return;
    }

    if (!userId) {
      throw new ForbiddenException('Post not accessible');
    }

    // Check if user is the creator
    const creator = await this.creatorsService.findByUserId(userId);
    if (creator?.id === post.creatorId) {
      return;
    }

    if (post.visibility === PostVisibility.FOLLOWERS) {
      if (!post.creatorId) {
        throw new ForbiddenException('Post not accessible');
      }
      const isFollowing = await this.followService.isFollowing(
        userId,
        post.creatorId,
      );
      if (!isFollowing) {
        throw new ForbiddenException('Follow this creator to view this post');
      }
    }

    if (post.visibility === PostVisibility.SUBSCRIBERS) {
      // TODO: Check subscription status when subscription system is implemented
      throw new ForbiddenException('Subscribe to view this post');
    }
  }

  private mapPostToResponse(
    post: Post,
    isLiked: boolean,
    profile?: UserProfile,
  ): PostResponseDto {
    return {
      id: post.id,
      creatorId: post.creatorId,
      title: post.title,
      body: post.body,
      visibility: post.visibility,
      isPinned: post.isPinned,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      viewsCount: post.viewsCount,
      media: (post.media || []).map((m) => ({
        id: m.id,
        s3Url: m.s3Url,
        s3Key: m.s3Key,
        type: m.type,
        mimeType: m.mimeType,
        fileSize: m.fileSize,
        width: m.width,
        height: m.height,
        duration: m.duration,
        thumbnailUrl: m.thumbnailUrl,
        sortOrder: m.sortOrder,
      })),
      creator: {
        id: post.creator.id,
        userId: post.creator.userId,
        title: post.creator.title,
        bio: post.creator.bio,
        user: {
          id: post.creator.user.id,
          firstName: post.creator.user.firstName,
          lastName: post.creator.user.lastName,
          profileImageUrl: post.creator.user.profileImageUrl,
        },
        profile: profile
          ? {
              handle: profile.handle,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            }
          : undefined,
      },
      isLiked,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private async ensureCreatorProfile(
    userId: string,
  ): Promise<CreatorResponseDto> {
    const existing = await this.creatorsService.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const defaultCreator: CreateCreatorDto = {
      title: 'Community Creator',
      bio: 'Auto-created when posting for the first time.',
    };

    return this.creatorsService.create(userId, defaultCreator);
  }

  private async getProfilesForPosts(
    posts: Post[],
  ): Promise<Map<string, UserProfile>> {
    const userIds = [...new Set(posts.map((p) => p.creator.userId))];
    if (userIds.length === 0) return new Map();

    const profiles = await this.profileRepo.find({
      where: { userId: In(userIds) },
    });

    return new Map(profiles.map((p) => [p.userId, p]));
  }

  private mapCommentToResponse(
    comment: PostComment,
    isLiked: boolean,
    repliesCount: number,
  ): CommentResponseDto {
    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      parentId: comment.parentId,
      content: comment.content,
      likesCount: comment.likesCount,
      isEdited: comment.isEdited,
      author: {
        id: comment.user.id,
        firstName: comment.user.firstName,
        lastName: comment.user.lastName,
        profileImageUrl: comment.user.profileImageUrl,
      },
      isLiked,
      repliesCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
