import { IsEnum, IsNumber, IsString, IsOptional } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  POSTGRES_DB: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION?: string;

  @IsString()
  @IsOptional()
  REDIS_DB?: string;

  @IsString()
  @IsOptional()
  REDIS_ENABLED?: string;

  @IsString()
  @IsOptional()
  S3_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  S3_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  S3_BUCKET_NAME?: string;

  @IsString()
  @IsOptional()
  S3_REGION?: string;

  @IsString()
  @IsOptional()
  S3_BUCKET_URL?: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  PAYMENT_SERVICE_URL?: string;

  @IsString()
  @IsOptional()
  WHISH_CHANNEL?: string;

  @IsString()
  @IsOptional()
  WHISH_SECRET?: string;

  @IsString()
  @IsOptional()
  WHISH_WEBSITE_URL?: string;

  @IsString()
  @IsOptional()
  CLERK_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  CLERK_PUBLISHABLE_KEY?: string;

  @IsString()
  @IsOptional()
  CLERK_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  QDRANT_URL?: string;

  @IsString()
  @IsOptional()
  QDRANT_API_KEY?: string;

  // Reranking configuration
  @IsString()
  @IsOptional()
  RERANK_PROVIDER?: string;

  @IsString()
  @IsOptional()
  RERANK_API_KEY?: string;

  @IsString()
  @IsOptional()
  RERANK_MODEL?: string;

  @IsString()
  @IsOptional()
  RERANK_BASE_URL?: string;

  // BM25 configuration
  @IsString()
  @IsOptional()
  BM25_K1?: string;

  @IsString()
  @IsOptional()
  BM25_B?: string;

  // Hybrid search weights
  @IsString()
  @IsOptional()
  HYBRID_BM25_WEIGHT?: string;

  @IsString()
  @IsOptional()
  HYBRID_VECTOR_WEIGHT?: string;
}
