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

### Phase 3: Feature Modules (In Progress)

- 🟡 Creators module (next)
- ⏳ Agents module
- ⏳ Documents & RAG modules
- ⏳ Conversations module
- ⏳ Payments module (Whish integration)
- ⏳ Sessions module
- ⏳ Notifications module
- ⏳ Admin module

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
- **TypeORM** - Database ORM
- **PostgreSQL** - Primary database
- **Passport & JWT** - Authentication
- **Swagger** - API documentation
- **class-validator** - DTO validation
- **bcrypt** - Password hashing
- **helmet** - Security headers

## 🗂️ Module Responsibilities

### Infrastructure Modules

- **ConfigModule**: Type-safe environment variable management with validation
- **DatabaseModule**: TypeORM setup with PostgreSQL
- **RedisModule**: Caching layer (stub, to be implemented)
- **S3Module**: File storage (stub, to be implemented)
- **VectorDbModule**: Vector embeddings storage for RAG (stub)
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

#### 📄 Documents Module

- Document upload for agent training
- File storage (S3)
- Text extraction & chunking
- Metadata persistence

#### 🧠 RAG Module

- Embedding generation
- Vector search
- Context building for chat
- LLM provider abstraction

#### 💬 Conversations Module

- Chat message handling
- Message persistence
- RAG integration
- Entitlement checks via Payments

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
NODE_ENV=development
PORT=3000
POSTGRES_DB=postgresql://...
JWT_SECRET=your-secret-key
# ... more
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

### Module Endpoints (To be implemented)

- `POST /api/auth/login` - User login
- `GET /api/users/me` - Current user profile
- `POST /api/agents` - Create agent
- `POST /api/documents/upload` - Upload training document
- `POST /api/conversations/message` - Send chat message
- `POST /api/payments/checkout` - Create checkout session
- ... more to come

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

### Phase 3: Core Features

- [ ] Agents CRUD
- [ ] Document upload & processing
- [ ] RAG implementation (embeddings, vector search)
- [ ] Conversations & chat

### Phase 4: Payments & Sessions

- [ ] Payment gateway integration
- [ ] Subscription management
- [ ] Entitlement checks
- [ ] Session booking & video integration

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
