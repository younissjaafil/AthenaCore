import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { AgentsRepository } from '../agents/repositories/agents.repository';
import { CreatorsService } from '../creators/creators.service';
import {
  UploadDocumentDto,
  UnifiedUploadDocumentDto,
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

  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  async deleteDocument(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    // User ID is used as creator ID to verify ownership via agent
    await this.documentsService.deleteDocument(id, user.id);
  }
}
