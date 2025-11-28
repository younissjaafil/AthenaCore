# Athena Core - AI Agent Platform Backend

A comprehensive NestJS monolith architecture for the Athena v1 AI agent platform, featuring RAG (Retrieval Augmented Generation), payments, live sessions, and Clerk authentication.

## ✅ Implementation Status

### Phase 1: Infrastructure & Core Setup ✅

- ✅ Configuration module with type-safe environment validation
- ✅ Database layer (TypeORM + PostgreSQL with pgvector)
- ✅ Redis caching layer
- ✅ S3 file storage
- ✅ Vector store (pgvector integration)
- ✅ Common utilities (decorators, guards, interceptors, filters, pipes)
- ✅ Railway deployment configuration
- ✅ Swagger API documentation

### Phase 2: Authentication & Users ✅

- ✅ Clerk authentication integration
- ✅ User entity with Clerk sync
- ✅ Webhook handler for user events (create/update/delete)
- ✅ JWT validation strategy
- ✅ Global authentication guard with @Public() decorator support
- ✅ User service with CRUD operations

### Phase 3: Feature Modules ✅

- ✅ Creators module - Profile management, verification, statistics
- ✅ Agents module - AI agent CRUD with RAG config, pricing, visibility
- ✅ Documents module - File upload, S3 storage, text extraction (PDF, DOCX, TXT)
- ✅ RAG module - Embeddings generation, vector search, context retrieval

### Phase 4: Advanced Features

- ✅ Conversations module - Real-time chat with RAG-powered agents
  - Conversation management (create, list, archive)
  - Message persistence with metadata
  - RAG context retrieval for AI responses
  - Conversation history tracking
  - Token counting and usage tracking
- ✅ Infrastructure testing - All services connected and verified
  - PostgreSQL (Railway)
  - Redis (Railway)
  - AWS S3 (eu-north-1)
  - OpenAI API (text-embedding-3-small)
  - Qdrant Vector Database
  - Clerk Authentication
- ⏳ Payments module - Whish payment gateway integration
- ⏳ Sessions module - Live session booking with creators
- ⏳ Notifications module - Email, SMS, push notifications
- ⏳ Admin module - Administrative operations

## 🧠 RAG Architecture

### How It Works

The RAG (Retrieval Augmented Generation) system enables AI agents to answer questions based on uploaded documents:

1. **Document Upload** → User uploads PDF/DOCX/TXT files via Documents API
2. **Text Extraction** → Content extracted using specialized parsers (pdf-parse, mammoth)
3. **Chunking** → Text split into manageable chunks (default: 1000 chars with 200 overlap)
4. **Embedding Generation** → Each chunk converted to 1536-dim vector using OpenAI
5. **Storage** → Embeddings stored in PostgreSQL with pgvector extension
6. **Search** → User query converted to embedding, cosine similarity search finds relevant chunks
7. **Context Building** → Top results aggregated into context string (respects token limits)
8. **Response** → Context used to power agent responses (integration pending in Conversations module)

### Technical Details

**Embedding Model:** OpenAI `text-embedding-3-small` (1536 dimensions)

**Vector Search:** PostgreSQL pgvector with cosine similarity operator (`<=>`)

**Chunking Strategy:**

- Recursive character text splitter (LangChain)
- Default chunk size: 1000 characters
- Overlap: 200 characters (preserves context between chunks)

**Caching:**

- Redis caching for search results
- 1-hour TTL to balance freshness and performance
- Cache key includes query hash and parameters

**Performance:**

- Batch processing for embeddings
- Database transactions for data consistency
- Indexed on agentId, documentId for fast queries

## 🏗️ Architecture Overview

This is a **monolith architecture** designed for scalability and maintainability, with clear separation of concerns across infrastructure, common utilities, and feature modules.

### Project Structure

```
athena-backend/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   │
│   ├── config/                    # Configuration layer
│   │   ├── config.module.ts
│   │   ├── config.service.ts
│   │   └── validation.env.ts      # Environment variable validation
│   │
│   ├── common/                    # Shared utilities
│   │   ├── decorators/            # @CurrentUser, @Roles
│   │   ├── guards/                # AuthGuard, RolesGuard
│   │   ├── interceptors/          # Logging, Timeout
│   │   ├── filters/               # HttpExceptionFilter
│   │   ├── pipes/                 # ValidationPipe
│   │   ├── dto/                   # PaginationDto
│   │   ├── utils/                 # Result, CryptoUtil
│   │   └── constants/             # Roles, Permissions enums
│   │
│   ├── infrastructure/            # Infrastructure layer
│   │   ├── database/              # TypeORM configuration
│   │   ├── cache/                 # Redis (stub)
│   │   ├── storage/               # S3 (stub)
│   │   ├── vector-store/          # Vector DB (stub)
│   │   ├── messaging/             # Queue (stub)
│   │   └── http/                  # HTTP client (stub)
│   │
│   └── modules/                   # Feature modules
│       ├── auth/                  # Authentication
│       ├── users/                 # User management
│       ├── creators/              # Creator profiles
│       ├── agents/                # AI Agent management
│       ├── documents/             # Document upload & RAG ingestion
│       ├── rag/                   # RAG engine
│       ├── conversations/         # Chat & conversations
│       ├── payments/              # Payments & subscriptions
│       ├── sessions/              # Live session booking
│       ├── notifications/         # Notifications
│       ├── admin/                 # Admin operations
│       └── health/                # Health checks
│
├── test/                          # E2E tests
├── .env                           # Environment variables
├── .env.development               # Development config
├── .env.production                # Production config (template)
├── railway.json                   # Railway deployment config
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- (Optional) Redis, S3, Vector DB for full features

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.development .env
# Edit .env with your database connection string

# Run development server
npm run start:dev
```

The server will start on `http://localhost:3000/api`

### API Documentation

Swagger documentation is available at: `http://localhost:3000/docs`

## 📦 Core Dependencies

- **NestJS 11** - Framework
- **TypeORM** - Database ORM with repository pattern
- **PostgreSQL** - Primary database (Railway)
- **Qdrant** - Vector database for RAG embeddings
- **Passport & JWT** - Authentication (Clerk integration)
- **OpenAI API** - Embeddings generation (text-embedding-3-small)
- **LangChain** - Document chunking utilities
- **AWS S3** - File storage for documents
- **Redis** - Caching layer for search results
- **Swagger** - API documentation
- **class-validator** - DTO validation
- **pdfjs-dist** - PDF text extraction (production-ready)
- **mammoth** - DOCX text extraction
- **tiktoken** - Token counting for embeddings

## 🗂️ Module Responsibilities

### Infrastructure Modules

- **ConfigModule**: Type-safe environment variable management with validation
- **DatabaseModule**: TypeORM setup with PostgreSQL and pgvector extension
- **RedisModule**: Caching layer for embedding search results ✅
- **S3Module**: AWS S3 file storage for documents ✅
- **VectorStoreModule**: pgvector integration for RAG embeddings ✅
- **QueueModule**: Async job processing (stub)
- **HttpModule**: External API calls wrapper (stub)

### Feature Modules

#### 🔐 Auth Module

- Token verification (Clerk/JWT)
- Map external auth → internal user_id
- Attach user to request via guards

#### 👤 Users Module

- Internal user representation
- Profile management
- Link to external auth providers

#### 🎨 Creators Module

- Creator profiles
- Payout information
- Creator statistics

#### 🤖 Agents Module (Core of Athena)

- Create/update/delete AI agents
- Agent configuration (prompt, model, pricing)
- Visibility settings (public/private)
- Model provider abstraction

#### 📄 Documents Module ✅

- Document upload for agent training
- S3 file storage with presigned URLs
- Text extraction (PDF, DOCX, TXT)
- Document metadata persistence
- Integration with RAG pipeline

#### 🧠 RAG Module ✅

- OpenAI embeddings generation (text-embedding-3-small, 1536 dimensions)
- Document chunking with configurable size/overlap (RecursiveCharacterTextSplitter)
- pgvector integration for similarity search
- Cosine similarity search with threshold filtering
- Redis caching for search results (1-hour TTL)
- Context aggregation with token limits
- Agent-level search statistics

#### 💬 Conversations Module ✅

- Conversation management (create, list, archive)
- Message persistence with full history
- **RAG-powered AI responses** with context retrieval
- Automatic conversation history for context
- Message metadata tracking (tokens, RAG sources, model used)
- Support for multiple conversations per user/agent pair
- Token counting and usage statistics

**RAG Integration:**

- Automatic semantic search for relevant context
- Top-5 most similar chunks retrieved per query
- Similarity threshold filtering (>60%)
- Context injection into system prompt
- Source citation in message metadata

**Response Generation:**

- Conversation history included (last 10 messages)
- System prompt + RAG context + history
- Simulated AI responses (OpenAI integration ready)
- Configurable RAG usage per message

#### 💳 Payments Module

- Payment gateway integration (Whish/Stripe)
- Subscription management
- Transaction tracking
- Entitlement service: `canAccessAgent(userId, agentId)`

#### 📞 Sessions Module

- Live session scheduling (student ↔ creator)
- Video provider integration (Jitsi/Daily/Zoom)
- Session status tracking

#### 🔔 Notifications Module

- Unified notification service
- Email, SMS, push notifications
- Used by payments, sessions, admin

#### ⚙️ Admin Module

- Admin-only endpoints
- User/creator/agent management
- System metrics
- Protected by RolesGuard with ADMIN role

#### ❤️ Health Module

- `/health` endpoint for uptime monitoring
- Database, Redis, S3, VectorDB connectivity checks

## 🔧 Common Utilities

### Decorators

- `@CurrentUser()` - Extract current user from request
- `@Roles(...roles)` - Define required roles for endpoints

### Guards

- `AuthGuard` - Verify user authentication
- `RolesGuard` - Check user has required roles

### Interceptors

- `LoggingInterceptor` - Log HTTP requests/responses
- `TimeoutInterceptor` - Timeout protection (30s)

### Filters

- `HttpExceptionFilter` - Global error handling

### DTOs

- `PaginationDto` - Reusable pagination params

### Utils

- `Result<T>` - Type-safe result wrapper
- `CryptoUtil` - Password hashing, token generation

## 🌱 Environment Variables

See `.env.development` for all available variables:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
POSTGRES_DB=postgresql://user:pass@host:port/database

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
JWT_SECRET=your-jwt-secret

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=athena-documents

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-password

# OpenAI
OPENAI_API_KEY=sk-...

# Payments (Whish)
WHISH_API_KEY=your-whish-key
WHISH_WEBHOOK_SECRET=whsec_...
```

## 🛠️ Development Workflow

### Creating New Features

1. **Generate Module**:

   ```bash
   npx nest g module modules/feature-name
   npx nest g controller modules/feature-name
   npx nest g service modules/feature-name
   ```

2. **Create Entities** (TypeORM):

   ```typescript
   @Entity('table_name')
   export class FeatureEntity {
     @PrimaryGeneratedColumn('uuid')
     id: string;
     // ... columns
   }
   ```

3. **Create DTOs** with validation:

   ```typescript
   export class CreateFeatureDto {
     @IsString()
     name: string;
   }
   ```

4. **Add to Swagger**:
   ```typescript
   @ApiTags('Feature')
   @Controller('feature')
   ```

### Database Migrations

```bash
# Generate migration
npm run typeorm migration:generate -- -n MigrationName

# Run migrations
npm run typeorm migration:run

# Revert migration
npm run typeorm migration:revert
```

## 📝 API Endpoints

### Core Endpoints

- `GET /api/health` - Health check
- `GET /docs` - Swagger API documentation

### Module Endpoints

**Authentication & Users:**

- `POST /api/auth/webhook` - Clerk webhook handler ✅
- `GET /api/users/me` - Current user profile ✅
- `GET /api/users/:id` - Get user by ID ✅

**Creators:**

- `POST /api/creators` - Create creator profile ✅
- `GET /api/creators` - List all creators ✅
- `GET /api/creators/:id` - Get creator details ✅
- `PATCH /api/creators/:id` - Update creator profile ✅
- `DELETE /api/creators/:id` - Delete creator ✅
- `GET /api/creators/:id/stats` - Get creator statistics ✅

**Agents:**

- `POST /api/agents` - Create AI agent ✅
- `GET /api/agents` - List agents with filters ✅
- `GET /api/agents/:id` - Get agent details ✅
- `PATCH /api/agents/:id` - Update agent ✅
- `DELETE /api/agents/:id` - Delete agent ✅
- `GET /api/agents/creator/:creatorId` - List creator's agents ✅

**Documents:**

- `POST /api/documents/upload` - Upload training document ✅
- `GET /api/documents/:id` - Get document details ✅
- `GET /api/documents/agent/:agentId` - List agent's documents ✅
- `DELETE /api/documents/:id` - Delete document ✅
- `GET /api/documents/:id/download` - Download document ✅

**RAG (Retrieval Augmented Generation):**

- `POST /api/rag/process/:documentId` - Process document into embeddings ✅
- `POST /api/rag/search` - Semantic similarity search ✅
- `GET /api/rag/context/:agentId` - Get context for query ✅
- `GET /api/rag/stats/:agentId` - Get agent embedding statistics ✅
- `GET /api/rag/embeddings/:documentId` - List document embeddings ✅

**Conversations:**

- `POST /api/conversations` - Create new conversation ✅
- `GET /api/conversations` - List user's conversations ✅
- `GET /api/conversations/:id` - Get conversation with messages ✅
- `POST /api/conversations/:id/messages` - Send message and get RAG-powered response ✅
- `PATCH /api/conversations/:id/archive` - Archive conversation ✅

**Coming Soon:**

- `POST /api/conversations/message` - Send chat message
- `POST /api/payments/checkout` - Create checkout session
- `POST /api/sessions/book` - Book live session

## 🎯 Implementation Roadmap

### Phase 1: Foundation ✅

- [x] Core infrastructure setup
- [x] Config module with validation
- [x] Database connection (TypeORM)
- [x] Common utilities (guards, decorators, filters)
- [x] Module scaffolds
- [x] Swagger documentation
- [x] Global validation & error handling

### Phase 2: Authentication & Users ✅

- [x] Clerk JWT strategy implementation
- [x] User entity & repository with Clerk sync
- [x] Clerk webhook endpoints (user create/update/delete)
- [x] Global authentication guard
- [x] Role-based access control (@Roles decorator ready)

### Phase 3: Core Features ✅

- [x] Creators module - Profile creation, verification, public listing
- [x] Agents CRUD - Create/manage AI agents with custom configs
- [x] Document upload & processing - S3 storage, PDF/DOCX/TXT extraction
- [x] RAG implementation - OpenAI embeddings, pgvector search, context retrieval
- [x] Vector search with Redis caching

### Phase 4: Payments & Sessions

- [x] Test infrastructure connections - All services connected
  - PostgreSQL (Railway)
  - Redis (Railway)
  - AWS S3 (eu-north-1)
  - OpenAI API (text-embedding-3-small)
  - Qdrant Vector Database
  - Clerk Authentication
- [x] Conversations & chat with RAG-powered responses
  - Conversation management
  - Message persistence
  - RAG context retrieval
  - AI response generation (simulated)
- [ ] Payments module implementation
  - Payment gateway integration (Whish)
  - Subscription management
  - Entitlement checks
- [ ] Sessions module implementation
  - Session booking
  - Video integration

### Phase 5: Production Ready

- [ ] Redis caching
- [ ] S3 file storage
- [ ] Queue for async jobs
- [ ] Docker deployment
- [ ] CI/CD pipeline
- [ ] Monitoring & logging

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🚂 Deployment (Railway)

This project is configured for deployment on Railway via GitHub integration.

### Setup

1. **Connect to Railway**:
   - Link your GitHub repository to Railway
   - Railway will auto-detect the NestJS project

2. **Environment Variables**:
   - Add all variables from `.env` to Railway's environment settings
   - Railway provides PostgreSQL and Redis add-ons

3. **Deployment**:

   ```bash
   # Push to main branch
   git push origin main

   # Railway will automatically:
   # - Install dependencies (npm install --legacy-peer-deps)
   # - Build the project (npm run build)
   # - Start the server (npm run start:prod)
   ```

4. **Database Setup**:
   - Enable pgvector extension:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```
   - Run migrations if needed:
     ```bash
     npm run typeorm migration:run
     ```

5. **Environment Variables**:
   - Add all required variables to Railway's environment settings
   - Use Railway's PostgreSQL add-on for `POSTGRES_DB`
   - Add OpenAI API key for RAG functionality
   - Configure AWS S3 credentials for document storage
   - Set up Clerk credentials for authentication

### Railway Configuration (`railway.json`)

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Swagger Documentation](https://swagger.io/docs/)

## 📄 License

UNLICENSED - Private project

---

**Built with ❤️ for Athena v1**
