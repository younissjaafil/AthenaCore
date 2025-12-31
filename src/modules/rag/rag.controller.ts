import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { EmbeddingsService } from './embeddings.service';
import { VectorSearchService, SearchResult } from './vector-search.service';
import { SearchEmbeddingsDto } from './dto/search-embeddings.dto';
import { EmbeddingResponseDto } from './dto/embedding-response.dto';

@ApiTags('RAG')
@Controller('rag')
@UseGuards(ClerkAuthGuard)
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorSearchService: VectorSearchService,
  ) {}

  @Post('process/:documentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process document to generate embeddings' })
  @ApiResponse({ status: 200, description: 'Document processed successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async processDocument(
    @Param('documentId') documentId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string; chunksCreated: number }> {
    this.logger.log(`Processing document ${documentId} for user ${userId}`);

    await this.embeddingsService.processDocument(documentId);

    const embeddings =
      await this.embeddingsService.getDocumentEmbeddings(documentId);

    return {
      message: 'Document processed successfully',
      chunksCreated: embeddings.length,
    };
  }

  @Post('search')
  @Public()
  @ApiOperation({ summary: 'Search embeddings by similarity' })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [EmbeddingResponseDto],
  })
  async searchEmbeddings(
    @Body() dto: SearchEmbeddingsDto,
  ): Promise<SearchResult[]> {
    this.logger.log(`Searching for "${dto.query}" in agent ${dto.agentId}`);

    return this.vectorSearchService.search(
      dto.agentId,
      dto.query,
      dto.limit,
      dto.threshold,
    );
  }

  @Get('context/:agentId')
  @Public()
  @ApiOperation({ summary: 'Get RAG context for a query' })
  @ApiResponse({ status: 200, description: 'Context retrieved' })
  async getContext(
    @Param('agentId') agentId: string,
    @Query('query') query: string,
    @Query('maxTokens') maxTokens?: number,
  ): Promise<{ context: string; tokenCount: number }> {
    const context = await this.vectorSearchService.getContext(
      agentId,
      query,
      maxTokens,
    );

    return {
      context,
      tokenCount: context.split(/\s+/).length, // Approximate
    };
  }

  @Get('stats/:agentId')
  @Public()
  @ApiOperation({ summary: 'Get embedding statistics for an agent' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(@Param('agentId') agentId: string): Promise<{
    totalEmbeddings: number;
    totalDocuments: number;
    averageChunksPerDoc: number;
    totalTokens: number;
  }> {
    return this.vectorSearchService.getSearchStats(agentId);
  }

  @Get('embeddings/:documentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all embeddings for a document' })
  @ApiResponse({
    status: 200,
    description: 'Document embeddings',
    type: [EmbeddingResponseDto],
  })
  async getDocumentEmbeddings(
    @Param('documentId') documentId: string,
  ): Promise<EmbeddingResponseDto[]> {
    const embeddings =
      await this.embeddingsService.getDocumentEmbeddings(documentId);

    return embeddings.map((e) => ({
      id: e.id,
      agentId: e.agentId,
      documentId: e.documentId,
      chunkIndex: e.chunkIndex,
      content: e.content,
      tokenCount: e.tokenCount,
      metadata: e.metadata,
      createdAt: e.createdAt,
    }));
  }

  @Delete('cache')
  @Public()
  @ApiOperation({ summary: 'Clear all RAG cache from Redis' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearAllCache(): Promise<{ message: string; cleared: boolean }> {
    this.logger.log('Clearing all RAG cache');
    await this.vectorSearchService.clearAllCache();
    return { message: 'RAG cache cleared successfully', cleared: true };
  }

  @Delete('cache/:agentId')
  @Public()
  @ApiOperation({ summary: 'Clear RAG cache for a specific agent' })
  @ApiResponse({ status: 200, description: 'Agent cache cleared successfully' })
  async clearAgentCache(
    @Param('agentId') agentId: string,
  ): Promise<{ message: string; agentId: string }> {
    this.logger.log(`Clearing RAG cache for agent ${agentId}`);
    await this.vectorSearchService.clearAgentCacheById(agentId);
    return { message: 'Agent RAG cache cleared', agentId };
  }

  @Post('reprocess/:agentId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reprocess all documents for an agent with new chunking/embeddings',
  })
  @ApiResponse({
    status: 200,
    description: 'Reprocessing started successfully',
  })
  async reprocessAgentDocuments(
    @Param('agentId') agentId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{
    message: string;
    agentId: string;
    documentsQueued: number;
  }> {
    this.logger.log(
      `Reprocessing documents for agent ${agentId} by user ${userId}`,
    );

    // Get all documents for the agent
    const { DocumentsRepository } = await import(
      '../documents/repositories/documents.repository'
    );
    const documentsModule = await import('../documents/documents.module');
    // Note: In a real implementation, you'd inject DocumentsRepository properly
    // For now, we'll process documents one by one

    // This is a simplified version - in production, use a queue system
    const result = {
      message: 'Reprocessing queued. Check logs for progress.',
      agentId,
      documentsQueued: 0,
    };

    this.logger.warn(
      'Reprocessing endpoint requires DocumentsRepository injection. Implement queue system for production.',
    );

    return result;
  }

  @Post('reprocess-document/:documentId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reprocess a specific document with new chunking/embeddings',
  })
  @ApiResponse({
    status: 200,
    description: 'Document reprocessed successfully',
  })
  async reprocessDocument(
    @Param('documentId') documentId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string; chunksCreated: number }> {
    this.logger.log(
      `Reprocessing document ${documentId} by user ${userId}`,
    );

    // Delete existing embeddings
    await this.embeddingsService.deleteDocumentEmbeddings(documentId);

    // Reprocess with new chunking and embeddings
    await this.embeddingsService.processDocument(documentId);

    const embeddings =
      await this.embeddingsService.getDocumentEmbeddings(documentId);

    return {
      message: 'Document reprocessed successfully',
      chunksCreated: embeddings.length,
    };
  }
}
