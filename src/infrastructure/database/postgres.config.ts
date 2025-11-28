import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '../../config/config.service';

export const getTypeOrmConfig = (
  configService: ConfigService,
): DataSourceOptions => {
  return {
    type: 'postgres',
    url: configService.postgresDb,
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
    synchronize: configService.isDevelopment, // Only in development
    logging: configService.isDevelopment,
    ssl: configService.isProduction
      ? {
          rejectUnauthorized: false,
        }
      : false,
  };
};

export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.POSTGRES_DB,
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
