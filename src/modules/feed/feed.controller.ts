import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { FeedService } from './feed.service';
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
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // ==================== FEED ENDPOINTS ====================

  @Get()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get home feed (posts from followed creators)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: FeedResponseDto })
  async getHomeFeed(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<FeedResponseDto> {
    return this.feedService.getHomeFeed(user.id, page, limit);
  }

  @Get('discover')
  @Public()
  @ApiOperation({ summary: 'Get discover feed (trending public posts)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: FeedResponseDto })
  async getDiscoverFeed(
    @CurrentUser() user: User | null,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<FeedResponseDto> {
    return this.feedService.getDiscoverFeed(page, limit, user?.id);
  }

  // ==================== POST CRUD ====================

  @Post('posts')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post (creators only)' })
  @ApiResponse({ status: 201, type: PostResponseDto })
  async createPost(
    @CurrentUser() user: User,
    @Body() dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    return this.feedService.createPost(user.id, dto);
  }

  @Get('posts/:id')
  @Public()
  @ApiOperation({ summary: 'Get a single post' })
  @ApiResponse({ status: 200, type: PostResponseDto })
  async getPost(
    @Param('id') id: string,
    @CurrentUser() user: User | null,
  ): Promise<PostResponseDto> {
    return this.feedService.getPost(id, user?.id);
  }

  @Patch('posts/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  @ApiResponse({ status: 200, type: PostResponseDto })
  async updatePost(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.feedService.updatePost(user.id, id, dto);
  }

  @Delete('posts/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 204 })
  async deletePost(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.feedService.deletePost(user.id, id);
  }

  // ==================== LIKES ====================

  @Post('posts/:id/like')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ status: 204 })
  async likePost(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.feedService.likePost(user.id, id);
  }

  @Delete('posts/:id/like')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ status: 204 })
  async unlikePost(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.feedService.unlikePost(user.id, id);
  }

  // ==================== COMMENTS ====================

  @Get('posts/:id/comments')
  @Public()
  @ApiOperation({ summary: 'Get post comments' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Get replies to a comment',
  })
  @ApiResponse({ status: 200, type: CommentsResponseDto })
  async getPostComments(
    @Param('id') postId: string,
    @CurrentUser() user: User | null,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('parentId') parentId?: string,
  ): Promise<CommentsResponseDto> {
    return this.feedService.getPostComments(
      postId,
      page,
      limit,
      user?.id,
      parentId,
    );
  }

  @Post('posts/:id/comments')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  async createComment(
    @CurrentUser() user: User,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.feedService.createComment(user.id, postId, dto);
  }

  @Patch('comments/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  async updateComment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.feedService.updateComment(user.id, id, dto);
  }

  @Delete('comments/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204 })
  async deleteComment(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.feedService.deleteComment(user.id, id);
  }

  @Post('comments/:id/like')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Like a comment' })
  @ApiResponse({ status: 204 })
  async likeComment(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.feedService.likeComment(user.id, id);
  }

  @Delete('comments/:id/like')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a comment' })
  @ApiResponse({ status: 204 })
  async unlikeComment(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.feedService.unlikeComment(user.id, id);
  }
}

// ==================== CREATOR POSTS CONTROLLER ====================

@ApiTags('Creators')
@Controller('creators')
export class CreatorPostsController {
  constructor(private readonly feedService: FeedService) {}

  @Get(':id/posts')
  @Public()
  @ApiOperation({ summary: 'Get posts by creator' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: FeedResponseDto })
  async getCreatorPosts(
    @Param('id') creatorId: string,
    @CurrentUser() user: User | null,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<FeedResponseDto> {
    return this.feedService.getCreatorPosts(creatorId, page, limit, user?.id);
  }
}
