import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function enablePgVector() {
  console.log('🔧 Enabling pgvector extension...\n');

  try {
    const dataSource = new DataSource({
      type: 'postgres',
      url: process.env.POSTGRES_DB,
      synchronize: false,
    });

    await dataSource.initialize();
    console.log('✅ Connected to PostgreSQL');

    // Enable pgvector extension
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ pgvector extension enabled successfully');

    // Verify extension
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [result] = await dataSource.query(
      "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'",
    );

    if (result) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log(`✅ pgvector version: ${result.extversion}`);
    }

    await dataSource.destroy();
    console.log('\n✅ All done!');
  } catch (error: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.error('❌ Failed to enable pgvector:', error.message);
    process.exit(1);
  }
}

void enablePgVector();
