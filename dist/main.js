"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Athena AI API')
        .setDescription('Athena AI backend (v1) – agents, RAG, payments, sessions, and more.')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Auth', 'Authentication endpoints')
        .addTag('Users', 'User management')
        .addTag('Creators', 'Creator profiles')
        .addTag('Agents', 'AI Agent management')
        .addTag('Documents', 'Document upload and management')
        .addTag('RAG', 'Retrieval Augmented Generation')
        .addTag('Conversations', 'Chat and conversations')
        .addTag('Payments', 'Payment and subscriptions')
        .addTag('Sessions', 'Live session booking')
        .addTag('Admin', 'Admin operations')
        .addTag('Health', 'Health checks')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document);
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Athena API is running on: http://localhost:${port}/api`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map