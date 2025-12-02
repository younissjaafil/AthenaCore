require('dotenv').config();
const { Client } = require('pg');

async function checkColumns() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_DB;
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Check actual column names (case-sensitive)
    const result = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'date_overrides'
      ORDER BY ordinal_position
    `);

    console.log('📋 Actual column names in date_overrides:');
    result.rows.forEach((row) => {
      console.log(`  "${row.column_name}" (${row.data_type})`);
    });

    // Check foreign keys
    const fkeys = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'date_overrides'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);

    console.log('\n🔗 Foreign keys:');
    fkeys.rows.forEach((row) => {
      console.log(`  ${row.constraint_name}:`);
      console.log(
        `    "${row.column_name}" -> ${row.foreign_table}."${row.foreign_column}"`,
      );
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkColumns();
