import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Post, PostVisibility } from '../entities/post.entity';
import { PostLike } from '../entities/post-like.entity';
import { PostComment } from '../entities/post-comment.entity';
import { CommentLike } from '../entities/comment-like.entity';
import { PostMedia } from '../entities/post-media.entity';

@Injectable()
export class FeedRepository {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly commentRepository: Repository<PostComment>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(PostMedia)
    private readonly mediaRepository: Repository<PostMedia>,
  ) {}

  // ==================== POSTS ====================

  async createPost(creatorId: string | null, data: Partial<Post>): Promise<Post> {
    const post = this.postRepository.create({
      ...data,
      creatorId,
    });
    return this.postRepository.save(post);
  }

  async findPostById(id: string): Promise<Post | null> {
    return this.postRepository.findOne({
      where: { id },
      relations: ['creator', 'creator.user', 'media'],
    });
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post | null> {
    await this.postRepository.update(id, data);
    return this.findPostById(id);
  }

  async deletePost(id: string): Promise<void> {
    await this.postRepository.delete(id);
  }

  async findCreatorPosts(
    creatorId: string,
    page: number = 1,
    limit: number = 20,
    includeNonPublic: boolean = false,
  ): Promise<{ posts: Post[]; total: number }> {
    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'user')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.creatorId = :creatorId', { creatorId })
      .orderBy('post.isPinned', 'DESC')
      .addOrderBy('post.createdAt', 'DESC');

    if (!includeNonPublic) {
      qb.andWhere('post.visibility = :visibility', {
        visibility: PostVisibility.PUBLIC,
      });
    }

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { posts, total };
  }

  async findFeedForUser(
    userId: string,
    followedCreatorIds: string[],
    subscribedCreatorIds: string[],
    page: number = 1,
    limit: number = 20,
  ): Promise<{ posts: Post[]; total: number }> {
    if (followedCreatorIds.length === 0 && subscribedCreatorIds.length === 0) {
      return { posts: [], total: 0 };
    }

    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'user')
      .leftJoinAndSelect('post.media', 'media');

    // Build visibility conditions
    const conditions: string[] = [];
    const params: Record<string, any> = {};

    // Public posts from followed creators
    if (followedCreatorIds.length > 0) {
      conditions.push(
        '(post.creatorId IN (:...followedIds) AND post.visibility IN (:...followerVisibilities))',
      );
      params.followedIds = followedCreatorIds;
      params.followerVisibilities = [
        PostVisibility.PUBLIC,
        PostVisibility.FOLLOWERS,
      ];
    }

    // Subscriber-only posts from subscribed creators
    if (subscribedCreatorIds.length > 0) {
      conditions.push(
        '(post.creatorId IN (:...subscribedIds) AND post.visibility = :subscriberVisibility)',
      );
      params.subscribedIds = subscribedCreatorIds;
      params.subscriberVisibility = PostVisibility.SUBSCRIBERS;
    }

    if (conditions.length > 0) {
      qb.where(`(${conditions.join(' OR ')})`, params);
    }

    qb.orderBy('post.createdAt', 'DESC');

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { posts, total };
  }

  async findDiscoverFeed(
    page: number = 1,
    limit: number = 20,
    excludeCreatorIds: string[] = [],
  ): Promise<{ posts: Post[]; total: number }> {
    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'user')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.visibility = :visibility', {
        visibility: PostVisibility.PUBLIC,
      });

    if (excludeCreatorIds.length > 0) {
      qb.andWhere('post.creatorId NOT IN (:...excludeIds)', {
        excludeIds: excludeCreatorIds,
      });
    }

    // Order by engagement (likes + comments) and recency
    qb.addSelect('(post.likesCount + post.commentsCount)', 'engagement_score')
      .orderBy('engagement_score', 'DESC')
      .addOrderBy('post.createdAt', 'DESC');

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { posts, total };
  }

  async incrementViewCount(postId: string): Promise<void> {
    await this.postRepository.increment({ id: postId }, 'viewsCount', 1);
  }

  // ==================== LIKES ====================

  async likePost(postId: string, userId: string): Promise<PostLike | null> {
    try {
      const like = this.postLikeRepository.create({ postId, userId });
      return await this.postLikeRepository.save(like);
    } catch {
      // Unique constraint violation - already liked
      return null;
    }
  }

  async unlikePost(postId: string, userId: string): Promise<boolean> {
    const result = await this.postLikeRepository.delete({ postId, userId });
    return (result.affected ?? 0) > 0;
  }

  async hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
    const count = await this.postLikeRepository.count({
      where: { postId, userId },
    });
    return count > 0;
  }

  async getUserLikedPostIds(
    postIds: string[],
    userId: string,
  ): Promise<string[]> {
    if (postIds.length === 0) return [];

    const likes = await this.postLikeRepository.find({
      where: { postId: In(postIds), userId },
      select: ['postId'],
    });
    return likes.map((l) => l.postId);
  }

  // ==================== COMMENTS ====================

  async createComment(
    postId: string,
    userId: string,
    content: string,
    parentId?: string,
  ): Promise<PostComment> {
    const comment = this.commentRepository.create({
      postId,
      userId,
      content,
      parentId,
    });
    return this.commentRepository.save(comment);
  }

  async findCommentById(id: string): Promise<PostComment | null> {
    return this.commentRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async updateComment(
    id: string,
    content: string,
  ): Promise<PostComment | null> {
    await this.commentRepository.update(id, { content, isEdited: true });
    return this.findCommentById(id);
  }

  async deleteComment(id: string): Promise<void> {
    await this.commentRepository.delete(id);
  }

  async findPostComments(
    postId: string,
    page: number = 1,
    limit: number = 20,
    parentId?: string,
  ): Promise<{ comments: PostComment[]; total: number }> {
    const qb = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.postId = :postId', { postId });

    if (parentId) {
      qb.andWhere('comment.parentId = :parentId', { parentId });
    } else {
      qb.andWhere('comment.parentId IS NULL');
    }

    qb.orderBy('comment.createdAt', 'DESC');

    const [comments, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { comments, total };
  }

  async countReplies(commentId: string): Promise<number> {
    return this.commentRepository.count({ where: { parentId: commentId } });
  }

  async likeComment(
    commentId: string,
    userId: string,
  ): Promise<CommentLike | null> {
    try {
      const like = this.commentLikeRepository.create({ commentId, userId });
      return await this.commentLikeRepository.save(like);
    } catch {
      return null;
    }
  }

  async unlikeComment(commentId: string, userId: string): Promise<boolean> {
    const result = await this.commentLikeRepository.delete({
      commentId,
      userId,
    });
    return (result.affected ?? 0) > 0;
  }

  async getUserLikedCommentIds(
    commentIds: string[],
    userId: string,
  ): Promise<string[]> {
    if (commentIds.length === 0) return [];

    const likes = await this.commentLikeRepository.find({
      where: { commentId: In(commentIds), userId },
      select: ['commentId'],
    });
    return likes.map((l) => l.commentId);
  }

  // ==================== MEDIA ====================

  async addMedia(
    postId: string,
    mediaData: Partial<PostMedia>[],
  ): Promise<PostMedia[]> {
    const mediaEntities = mediaData.map((m, index) =>
      this.mediaRepository.create({
        ...m,
        postId,
        sortOrder: m.sortOrder ?? index,
      }),
    );
    return this.mediaRepository.save(mediaEntities);
  }

  async deleteMedia(mediaId: string): Promise<void> {
    await this.mediaRepository.delete(mediaId);
  }
}
