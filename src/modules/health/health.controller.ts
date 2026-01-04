import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { QdrantService } from '../../infrastructure/vector-store/qdrant.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly qdrantService: QdrantService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Public()
  @Post('qdrant/recreate')
  @ApiOperation({ summary: 'Recreate Qdrant collection (fixes dimension mismatches)' })
  async recreateQdrantCollection() {
    await this.qdrantService.recreateCollection();
    return {
      status: 'success',
      message: 'Qdrant collection recreated successfully',
    };
  }
}
