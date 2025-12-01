import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.POSTGRES_DB,
    ssl: { rejectUnauthorized: false },
  });

  await dataSource.initialize();
  console.log('Connected to database');

  // Get all table names
  const tables = await dataSource.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename != 'migrations'
  `);

  console.log(
    'Tables found:',
    tables.map((t: any) => t.tablename),
  );

  // Disable foreign key checks and truncate all tables
  await dataSource.query('SET session_replication_role = replica;');

  for (const { tablename } of tables) {
    console.log(`Truncating ${tablename}...`);
    await dataSource.query(`TRUNCATE TABLE "${tablename}" CASCADE;`);
  }

  await dataSource.query('SET session_replication_role = DEFAULT;');

  console.log('All tables cleared!');
  await dataSource.destroy();
}

clearDatabase().catch(console.error);
