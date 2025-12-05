import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { PdfPreviewService } from './pdf-preview.service';
import { AgentsRepository } from '../agents/repositories/agents.repository';
import { CreatorsService } from '../creators/creators.service';
import {
  UploadDocumentDto,
  UnifiedUploadDocumentDto,
  UpdateDocumentDto,
} from './dto/upload-document.dto';
import {
  DocumentResponseDto,
  PublicDocumentResponseDto,
} from './dto/document-response.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { DocumentOwnerType } from './entities/document.entity';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly pdfPreviewService: PdfPreviewService,
    private readonly agentsRepository: AgentsRepository,
    private readonly creatorsService: CreatorsService,
  ) {}

  @Post('upload')
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload document for agent training (legacy - routes to unified)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, DOCX, TXT, MD, HTML, CSV, JSON)',
        },
        agentId: {
          type: 'string',
          format: 'uuid',
        },
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
      },
      required: ['file', 'agentId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: DocumentResponseDto,
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.uploadDocument(file, user.id, uploadDto);
  }

  @Post('upload-unified')
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Unified document upload (supports agent training, profile content, etc)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Document/media file (PDF, DOCX, images, videos, etc based on usage)',
        },
        ownerType: {
          type: 'string',
          enum: ['AGENT', 'CREATOR'],
          description:
            'Type of owner (AGENT for agent docs, CREATOR for profile)',
        },
        ownerId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of agent or creator',
        },
        forProfile: {
          type: 'boolean',
          default: false,
          description: 'Use in creator profile',
        },
        forRag: {
          type: 'boolean',
          default: false,
          description: 'Use for RAG/AI training',
        },
        agentId: {
          type: 'string',
          format: 'uuid',
          description:
            'Agent ID (required if forRag=true and ownerType=CREATOR)',
        },
        visibility: {
          type: 'string',
          enum: ['PUBLIC', 'FOLLOWERS', 'SUBSCRIBERS', 'PRIVATE'],
          default: 'PRIVATE',
        },
        pricingType: {
          type: 'string',
          enum: ['FREE', 'ONE_TIME', 'SUBSCRIPTION'],
          default: 'FREE',
        },
        priceCents: {
          type: 'number',
          description: 'Price in cents (if paid)',
        },
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
      },
      required: ['file', 'ownerType', 'ownerId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully with deduplication',
    type: DocumentResponseDto,
  })
  async uploadUnified(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UnifiedUploadDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.uploadUnified(file, user.id, uploadDto);
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Get all documents for an agent' })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved',
    type: [DocumentResponseDto],
  })
  async getAgentDocuments(
    @Param('agentId') agentId: string,
  ): Promise<DocumentResponseDto[]> {
    return this.documentsService.findByAgent(agentId);
  }

  @Get('my-documents')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get documents from all my agents' })
  @ApiResponse({
    status: 200,
    description: 'User documents retrieved',
    type: [DocumentResponseDto],
  })
  async getMyDocuments(
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto[]> {
    // Get creator profile from user
    const creator = await this.creatorsService.findByUserId(user.id);
    if (!creator) {
      return [];
    }
    // Get documents from agents owned by this creator
    const agents = await this.agentsRepository.findByCreator(creator.id);
    const agentIds = agents.map((a) => a.id);
    return this.documentsService.findByAgents(agentIds);
  }

  @Get('agent/:agentId/stats')
  @ApiOperation({ summary: 'Get document statistics for an agent' })
  @ApiResponse({
    status: 200,
    description: 'Document statistics',
  })
  async getAgentStats(@Param('agentId') agentId: string) {
    return this.documentsService.getAgentStats(agentId);
  }

  // ===== CREATOR PROFILE ENDPOINTS =====

  @Get('creator/:creatorId/profile')
  @Public()
  @ApiOperation({
    summary: 'Get public profile documents for a creator',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator ID' })
  @ApiResponse({
    status: 200,
    description: 'Public profile documents',
    type: [PublicDocumentResponseDto],
  })
  async getCreatorProfileDocs(
    @Param('creatorId') creatorId: string,
  ): Promise<PublicDocumentResponseDto[]> {
    // findPublicProfileDocs already returns properly formatted DTOs
    return this.documentsService.findPublicProfileDocs(creatorId);
  }

  @Get('creator/:creatorId/all')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all documents for a creator (own documents - private access)',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator ID' })
  @ApiResponse({
    status: 200,
    description: 'All creator documents',
    type: [DocumentResponseDto],
  })
  async getCreatorAllDocs(
    @Param('creatorId') creatorId: string,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto[]> {
    // Verify user owns this creator profile
    const creator = await this.creatorsService.findByUserId(user.id);
    if (!creator || creator.id !== creatorId) {
      // If not the owner, return empty array (or could throw ForbiddenException)
      return [];
    }
    return this.documentsService.findByOwner(
      DocumentOwnerType.CREATOR,
      creatorId,
    );
  }

  @Get(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document details' })
  @ApiResponse({
    status: 200,
    description: 'Document found',
    type: DocumentResponseDto,
  })
  async getDocument(@Param('id') id: string): Promise<DocumentResponseDto> {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update document properties (visibility, title, etc)',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
    type: DocumentResponseDto,
  })
  async updateDocument(
    @Param('id') id: string,
    @Body() updateDto: UpdateDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.updateDocument(id, user.id, updateDto);
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete document (admins can delete any document)' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  async deleteDocument(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    // User ID is used as creator ID to verify ownership via agent
    // Admins can delete any document
    await this.documentsService.deleteDocument(id, user.id, user.roles || []);
  }

  // ===== PDF PREVIEW ENDPOINTS =====

  @Get(':id/preview/info')
  @Public()
  @ApiOperation({ summary: 'Get PDF preview info (page count, has previews)' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'PDF preview info',
    schema: {
      type: 'object',
      properties: {
        pageCount: { type: 'number' },
        hasPreviewsGenerated: { type: 'boolean' },
        previewAvailable: { type: 'boolean' },
      },
    },
  })
  async getPreviewInfo(@Param('id') id: string): Promise<{
    pageCount: number;
    hasPreviewsGenerated: boolean;
    previewAvailable: boolean;
  }> {
    const document = await this.documentsService.findById(id);
    const hasPreviewsGenerated =
      await this.pdfPreviewService.hasPreviewsGenerated(id);
    const pageCount = document.metadata?.pageCount || 0;

    return {
      pageCount,
      hasPreviewsGenerated,
      previewAvailable: this.pdfPreviewService.isAvailable(),
    };
  }

  @Get(':id/preview/:page')
  @Public()
  @ApiOperation({ summary: 'Get signed URL for PDF page preview image' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiParam({ name: 'page', description: 'Page number (1-indexed)' })
  @ApiResponse({
    status: 200,
    description: 'Signed URL for the preview image (15 min expiry)',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  async getPreviewPage(
    @Param('id') id: string,
    @Param('page', ParseIntPipe) page: number,
  ): Promise<{ url: string; expiresIn: number }> {
    // Verify document exists
    await this.documentsService.findById(id);

    // Check if previews have been generated
    const hasPreview = await this.pdfPreviewService.hasPreviewsGenerated(id);

    if (!hasPreview) {
      throw new NotFoundException(
        'Preview not available for this document. It may still be processing.',
      );
    }

    const url = await this.pdfPreviewService.getPreviewSignedUrl(id, page);
    return { url, expiresIn: 900 }; // 15 minutes
  }

  @Post(':id/generate-previews')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate watermarked preview images for a PDF document',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Previews generated successfully',
    schema: {
      type: 'object',
      properties: {
        pageCount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async generatePreviews(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ pageCount: number; message: string }> {
    const document = await this.documentsService.findById(id);

    // Only PDFs can have previews generated
    if (!document.fileType?.includes('pdf')) {
      throw new BadRequestException(
        'Only PDF documents can have previews generated',
      );
    }

    // Generate previews
    const result = await this.pdfPreviewService.generateAllPreviews(
      id,
      document.s3Key,
    );

    // Update document metadata with page count
    await this.documentsService.updateMetadata(id, {
      pageCount: result.pageCount,
    });

    return {
      pageCount: result.pageCount,
      message: `Generated ${result.pageCount} watermarked preview pages`,
    };
  }

  @Post(':id/reprocess')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reprocess document to extract text and generate embeddings',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document queued for reprocessing',
    type: DocumentResponseDto,
  })
  async reprocessDocument(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.reprocessDocument(id, user.id);
  }
}
