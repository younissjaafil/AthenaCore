import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorPoint {
  id: string;
  vector: number[];
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
      this.logger.warn('QDRANT_URL not configured');
    }

    this.client = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey,
    });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        this.logger.log(`Creating collection: ${this.collectionName}`);
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

        this.logger.log(`Collection ${this.collectionName} created`);
      } else {
        this.logger.log(`Collection ${this.collectionName} already exists`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to ensure collection: ${error.message}`);
      throw error;
    }
  }

  async upsertPoints(points: VectorPoint[]): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
      this.logger.log(`Upserted ${points.length} points to Qdrant`);
    } catch (error: any) {
      this.logger.error(`Failed to upsert points: ${error.message}`);
      throw error;
    }
  }

  async search(
    agentId: string,
    queryVector: number[],
    limit: number = 5,
    scoreThreshold: number = 0.7,
  ): Promise<SearchResult[]> {
    try {
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

  async countByDocument(documentId: string): Promise<number> {
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
