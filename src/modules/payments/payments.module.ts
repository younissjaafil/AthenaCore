import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WhishService } from './services/whish.service';
import { TransactionsRepository } from './repositories/transactions.repository';
import { EntitlementsRepository } from './repositories/entitlements.repository';
import { Transaction } from './entities/transaction.entity';
import { Entitlement } from './entities/entitlement.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Entitlement, Agent]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    AuthModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WhishService,
    TransactionsRepository,
    EntitlementsRepository,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
