"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const config_module_1 = require("./config/config.module");
const database_module_1 = require("./infrastructure/database/database.module");
const redis_module_1 = require("./infrastructure/cache/redis.module");
const s3_module_1 = require("./infrastructure/storage/s3.module");
const vectordb_module_1 = require("./infrastructure/vector-store/vectordb.module");
const queue_module_1 = require("./infrastructure/messaging/queue.module");
const http_module_1 = require("./infrastructure/http/http.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const creators_module_1 = require("./modules/creators/creators.module");
const agents_module_1 = require("./modules/agents/agents.module");
const documents_module_1 = require("./modules/documents/documents.module");
const rag_module_1 = require("./modules/rag/rag.module");
const conversations_module_1 = require("./modules/conversations/conversations.module");
const payments_module_1 = require("./modules/payments/payments.module");
const sessions_module_1 = require("./modules/sessions/sessions.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const admin_module_1 = require("./modules/admin/admin.module");
const health_module_1 = require("./modules/health/health.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            database_module_1.DatabaseModule,
            redis_module_1.RedisModule,
            s3_module_1.S3Module,
            vectordb_module_1.VectorDbModule,
            queue_module_1.QueueModule,
            http_module_1.HttpModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            creators_module_1.CreatorsModule,
            agents_module_1.AgentsModule,
            documents_module_1.DocumentsModule,
            rag_module_1.RagModule,
            conversations_module_1.ConversationsModule,
            payments_module_1.PaymentsModule,
            sessions_module_1.SessionsModule,
            notifications_module_1.NotificationsModule,
            admin_module_1.AdminModule,
            health_module_1.HealthModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map