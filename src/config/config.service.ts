import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  // Database
  get postgresDb(): string {
    return this.configService.get<string>('POSTGRES_DB')!;
  }

  // JWT
  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET')!;
  }

  get jwtExpiration(): string {
    return this.configService.get<string>('JWT_EXPIRATION', '7d');
  }

  // Redis
  get redisDb(): string | undefined {
    return this.configService.get<string>('REDIS_DB');
  }

  // AWS S3
  get s3AccessKey(): string | undefined {
    return (
      this.configService.get<string>('S3_ACCESS_KEY') ||
      this.configService.get<string>('AWS_ACCESS_KEY_ID')
    );
  }

  get s3SecretKey(): string | undefined {
    return (
      this.configService.get<string>('S3_SECRET_KEY') ||
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
    );
  }

  get s3BucketName(): string | undefined {
    return this.configService.get<string>('S3_BUCKET_NAME');
  }

  get s3Region(): string {
    return (
      this.configService.get<string>('S3_REGION') ||
      this.configService.get<string>('AWS_REGION') ||
      'us-east-1'
    );
  }

  get s3BucketUrl(): string | undefined {
    return this.configService.get<string>('S3_BUCKET_URL');
  }

  // OpenAI
  get openaiApiKey(): string | undefined {
    return this.configService.get<string>('OPENAI_API_KEY');
  }

  // Payment Gateway (Whish)
  get paymentServiceUrl(): string | undefined {
    return this.configService.get<string>('PAYMENT_SERVICE_URL');
  }

  get whishChannel(): string | undefined {
    return this.configService.get<string>('WHISH_CHANNEL');
  }

  get whishSecret(): string | undefined {
    return this.configService.get<string>('WHISH_SECRET');
  }

  get whishWebsiteUrl(): string | undefined {
    return this.configService.get<string>('WHISH_WEBSITE_URL');
  }

  // External Auth
  get clerkSecretKey(): string | undefined {
    return this.configService.get<string>('CLERK_SECRET_KEY');
  }

  get clerkPublishableKey(): string | undefined {
    return this.configService.get<string>('CLERK_PUBLISHABLE_KEY');
  }

  get clerkWebhookSecret(): string | undefined {
    return this.configService.get<string>('CLERK_WEBHOOK_SECRET');
  }
}
