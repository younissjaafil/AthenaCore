import {
  Controller,
  Post,
  Get,
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
    @CurrentUser('userId') userId: string,
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
}
