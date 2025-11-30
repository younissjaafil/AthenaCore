import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentCallbackController } from './payment-callback.controller';
import { PaymentsService } from './payments.service';
import { WhishService } from './services/whish.service';
import { TransactionsRepository } from './repositories/transactions.repository';
import { EntitlementsRepository } from './repositories/entitlements.repository';
import { Transaction } from './entities/transaction.entity';
import { Entitlement } from './entities/entitlement.entity';
import { Agent } from '../agents/entities/agent.entity';
import { UsersModule } from '../users/users.module';
import { AgentsModule } from '../agents/agents.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Entitlement, Agent]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    UsersModule,
    forwardRef(() => AgentsModule),
    forwardRef(() => SessionsModule),
  ],
  controllers: [PaymentsController, PaymentCallbackController],
  providers: [
    PaymentsService,
    WhishService,
    TransactionsRepository,
    EntitlementsRepository,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
