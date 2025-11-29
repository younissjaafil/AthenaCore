import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { CreatorsRepository } from './repositories/creators.repository';
import { Creator } from './entities/creator.entity';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [TypeOrmModule.forFeature([Creator]), UsersModule, ConfigModule],
  controllers: [CreatorsController],
  providers: [CreatorsService, CreatorsRepository],
  exports: [CreatorsService, CreatorsRepository],
})
export class CreatorsModule {}
