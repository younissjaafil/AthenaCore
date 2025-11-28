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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document for agent training' })
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
  @ApiOperation({ summary: 'Get my uploaded documents' })
  @ApiResponse({
    status: 200,
    description: 'User documents retrieved',
    type: [DocumentResponseDto],
  })
  async getMyDocuments(
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto[]> {
    return this.documentsService.findByUser(user.id);
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

  @Get(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document details' })
  @ApiResponse({
    status: 200,
    description: 'Document found',
    type: DocumentResponseDto,
  })
  async getDocument(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.findOne(id, user.id);
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
    await this.documentsService.deleteDocument(id, user.id);
  }
}
