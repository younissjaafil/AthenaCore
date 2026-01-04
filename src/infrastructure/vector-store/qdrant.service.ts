import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorPoint {
  id: string;
  vector?: number[]; // Single vector (legacy)
  vectors?: {
    raw?: number[];
    summary?: number[];
  }; // Named vectors (new)
  payload: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  private readonly collectionName = 'embeddings';
  private readonly vectorSize = 1536; // text-embedding-3-small dimension

  constructor(private readonly configService: ConfigService) {
    const qdrantUrl = this.configService.get<string>('QDRANT_URL');
    const qdrantApiKey = this.configService.get<string>('QDRANT_API_KEY');

    if (!qdrantUrl) {
      this.logger.warn(
        'QDRANT_URL not configured - vector search will be unavailable',
      );
      return;
    }

    // For Qdrant Cloud, remove port if present (Cloud uses standard HTTPS ports)
    // Format should be: https://<cluster-id>.<region>.cloud.qdrant.io
    let normalizedUrl = qdrantUrl.trim();
    if (
      normalizedUrl.includes('.cloud.qdrant.io') &&
      normalizedUrl.includes(':6333')
    ) {
      this.logger.warn(
        'Qdrant Cloud URL detected with port 6333 - removing port (Cloud uses standard HTTPS)',
      );
      normalizedUrl = normalizedUrl.replace(':6333', '');
    }

    this.logger.log(
      `Connecting to Qdrant at: ${normalizedUrl.replace(/\/$/, '')}`,
    );

    this.client = new QdrantClient({
      url: normalizedUrl,
      apiKey: qdrantApiKey,
    });
  }

  async onModuleInit() {
    if (!this.client) {
      this.logger.warn(
        'Qdrant client not initialized - skipping collection setup',
      );
      return;
    }

    try {
      await this.ensureCollection();
    } catch (error: any) {
      // Log error but don't crash the app - vector search will just be unavailable
      this.logger.error(
        `Failed to initialize Qdrant collections. Vector search will be unavailable. Error: ${error.message}`,
      );
      this.logger.error(
        `Please verify QDRANT_URL and QDRANT_API_KEY are correct. URL format for Cloud should be: https://<cluster-id>.<region>.cloud.qdrant.io (without port)`,
      );
      // Don't throw - allow app to start without Qdrant
    }
  }

  private ensureClient(): void {
    if (!this.client) {
      throw new Error(
        'Qdrant client not initialized. Please configure QDRANT_URL and QDRANT_API_KEY.',
      );
    }
  }

  private async ensureCollection(): Promise<void> {
    this.ensureClient();

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (exists) {
        // Check if existing collection has correct vector configuration
        const collectionInfo = await this.client.getCollection(this.collectionName);
        const rawVectorConfig = (collectionInfo.config?.params as any)?.vectors?.raw;
        
        if (rawVectorConfig && rawVectorConfig.size !== this.vectorSize) {
          this.logger.warn(
            `Collection ${this.collectionName} has incorrect vector size (${rawVectorConfig.size} vs expected ${this.vectorSize}). Recreating collection...`,
          );
          
          // Delete existing collection
          await this.client.deleteCollection(this.collectionName);
          this.logger.log(`Deleted collection ${this.collectionName}`);
          
          // Create with correct configuration (fall through to creation logic below)
        } else {
          this.logger.log(`Collection ${this.collectionName} already exists with correct configuration`);
          return;
        }
      }

      // Create collection (either first time or after deletion)
      this.logger.log(`Creating collection: ${this.collectionName}`);
      // Use single unnamed vector (simplest configuration)
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      // Create payload indexes for efficient filtering
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'agentId',
        field_schema: 'keyword',
      });

      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'documentId',
        field_schema: 'keyword',
      });

      this.logger.log(`Collection ${this.collectionName} created successfully`);
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const status = error.status || error.$metadata?.httpStatusCode;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const errorUrl = error.url || 'unknown';

      let errorMessage = `Failed to ensure collection: ${error.message}`;

      if (status === 404) {
        errorMessage += `\n  - Qdrant endpoint returned 404 Not Found`;
        errorMessage += `\n  - URL: ${errorUrl}`;
        errorMessage += `\n  - This usually means:`;
        errorMessage += `\n    1. The Qdrant URL is incorrect (check for typos)`;
        errorMessage += `\n    2. For Qdrant Cloud, remove :6333 port from URL`;
        errorMessage += `\n    3. The Qdrant instance/cluster doesn't exist`;
        errorMessage += `\n    4. The API key doesn't have access to this cluster`;
      } else if (status === 401 || status === 403) {
        errorMessage += `\n  - Authentication failed (status ${status})`;
        errorMessage += `\n  - Please verify QDRANT_API_KEY is correct`;
      }

      this.logger.error(errorMessage);
      throw error;
    }
  }

  async upsertPoints(points: VectorPoint[]): Promise<void> {
    this.ensureClient();
    try {
      const qdrantPoints = points.map((p) => {
        const point: any = {
          id: p.id,
          payload: p.payload,
        };

        // Use unnamed vector (simple array) - collection uses single vector config
        if (p.vectors?.raw) {
          // Extract raw vector from named vectors format
          point.vector = p.vectors.raw;
        } else if (p.vector) {
          // Direct vector array
          point.vector = p.vector;
        } else {
          this.logger.error(`Point ${p.id} has no vectors`);
          throw new Error(`Point ${p.id} has no vectors`);
        }

        return point;
      });

      // Log first point structure for debugging
      if (qdrantPoints.length > 0) {
        const firstPoint = qdrantPoints[0];
        this.logger.log(
          `Upserting ${qdrantPoints.length} points. First point structure: ${JSON.stringify({
            id: firstPoint.id,
            hasVector: !!firstPoint.vector,
            vectorLength: Array.isArray(firstPoint.vector) ? firstPoint.vector.length : 'not-array',
            payloadKeys: Object.keys(firstPoint.payload),
          })}`,
        );
      }

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: qdrantPoints,
      });
      this.logger.log(`Upserted ${points.length} points to Qdrant`);
    } catch (error: any) {
      this.logger.error(`Failed to upsert points: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify({
        status: error.status,
        statusText: error.statusText,
        data: error.data,
        message: error.message,
      })}`);
      if (error.response) {
        this.logger.error(
          `Qdrant response: ${JSON.stringify(error.response.data || error.response)}`,
        );
      }
      throw error;
    }
  }

  async search(
    agentId: string,
    queryVector: number[],
    limit: number = 5,
    scoreThreshold: number = 0.7,
    vectorName: 'raw' | 'summary' = 'raw',
  ): Promise<SearchResult[]> {
    this.ensureClient();
    try {
      // Use unnamed vector for search (collection uses single vector config)
      const results = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
        filter: {
          must: [
            {
              key: 'agentId',
              match: { value: agentId },
            },
          ],
        },
        with_payload: true,
      });

      this.logger.log(
        `Qdrant: Found ${results.length} vectors (threshold: ${scoreThreshold})`,
      );

      return results.map((r) => ({
        id: r.id as string,
        score: r.score,
        payload: r.payload as Record<string, any>,
      }));
    } catch (error: any) {
      this.logger.error(`Search failed: ${error.message}`);
      throw error;
    }
  }

  async deleteByDocument(documentId: string): Promise<void> {
    this.ensureClient();
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'documentId',
              match: { value: documentId },
            },
          ],
        },
      });
      this.logger.log(`Deleted points for document ${documentId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete points: ${error.message}`);
      throw error;
    }
  }

  async deleteByAgent(agentId: string): Promise<void> {
    this.ensureClient();
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'agentId',
              match: { value: agentId },
            },
          ],
        },
      });
      this.logger.log(`Deleted points for agent ${agentId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete points: ${error.message}`);
      throw error;
    }
  }

  async countByAgent(agentId: string): Promise<number> {
    this.ensureClient();
    try {
      const result = await this.client.count(this.collectionName, {
        filter: {
          must: [
            {
              key: 'agentId',
              match: { value: agentId },
            },
          ],
        },
        exact: true,
      });
      return result.count;
    } catch (error: any) {
      this.logger.error(`Count failed: ${error.message}`);
      return 0;
    }
  }

  async recreateCollection(): Promise<void> {
    this.ensureClient();
    this.logger.warn('Manually recreating collection...');
    try {
      await this.client.deleteCollection(this.collectionName);
      this.logger.log(`Deleted collection ${this.collectionName}`);
    } catch (error: any) {
      this.logger.warn(`Collection deletion failed (may not exist): ${error.message}`);
    }
    await this.ensureCollection();
    this.logger.log('Collection recreated successfully');
  }

  async countByDocument(documentId: string): Promise<number> {
    this.ensureClient();
    try {
      const result = await this.client.count(this.collectionName, {
        filter: {
          must: [
            {
              key: 'documentId',
              match: { value: documentId },
            },
          ],
        },
        exact: true,
      });
      return result.count;
    } catch (error: any) {
      this.logger.error(`Count failed: ${error.message}`);
      return 0;
    }
  }
}
