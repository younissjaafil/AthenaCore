require('dotenv').config();
const { Client } = require('pg');

async function fixForeignKey() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_DB;
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database\n');

    // Drop the WRONG foreign key (pointing to non-existent "creator" table)
    console.log(
      '🗑️  Dropping incorrect foreign key: date_overrides_creatorId_fkey',
    );
    await client.query(`
      ALTER TABLE date_overrides 
      DROP CONSTRAINT IF EXISTS "date_overrides_creatorId_fkey"
    `);
    console.log('   ✅ Dropped\n');

    // Verify only one FK remains
    const result = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'date_overrides' 
        AND constraint_type = 'FOREIGN KEY'
    `);

    console.log('📋 Remaining foreign keys:');
    result.rows.forEach((row) => {
      console.log(`   - ${row.constraint_name}`);
    });

    console.log(
      '\n✅ Done! Only the correct FK should remain: date_overrides_creatorid_fkey',
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixForeignKey();
