import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { DatabaseSafetyGuard } from '../src/utils/db-safety';

// Load environment variables. Default to .env.qa if not specified.
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../.env.qa') });

export async function resetDatabase(): Promise<void> {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'qa_user';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME;
  const environment = process.env.ENVIRONMENT;

  const isConfirmed = process.argv.includes('--confirm') || process.env.CONFIRM_DB_RESET === 'true';

  // Enforce destructive operation safety boundary before opening connections
  const safetyCheck = DatabaseSafetyGuard.validateResetSafety({
    environment,
    databaseName: database,
    isConfirmed,
  });

  if (!safetyCheck.isSafe) {
    console.error(`
================================================================================
[DATABASE RESET BLOCKED — CRITICAL SAFETY CONTROL]
================================================================================
The database reset operation is destructive and permanently drops all data.
It is restricted to authorized test and local environments only.

Safety Failure:     ${safetyCheck.reason}
Target Environment: ${environment || '<undefined>'}
Target Database:    ${database || '<undefined>'}

To run safely in permitted environments:
  1. Ensure ENVIRONMENT is set to 'local', 'test', or 'qa' (current: ${environment || '<none>'}).
  2. Ensure DB_NAME is an approved test database (e.g., 'platione_test').
  3. Supply the required confirmation flag:
       npm run reset:db -- --confirm
     or set environment variable:
       CONFIRM_DB_RESET=true
================================================================================
`);
    process.exit(1);
  }

  const safeDatabaseName = database!;

  console.log(`[reset-db] Connecting to MySQL server at ${host}:${port}...`);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    console.log(`[reset-db] Dropping database "${safeDatabaseName}"...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${safeDatabaseName}\``);
    console.log(`[reset-db] Database "${safeDatabaseName}" dropped successfully.`);

    console.log(`[reset-db] Creating database "${safeDatabaseName}"...`);
    await connection.query(`CREATE DATABASE \`${safeDatabaseName}\``);
    console.log(`[reset-db] Database "${safeDatabaseName}" created successfully.`);

    // Connect to the newly created DB to apply migrations
    await connection.query(`USE \`${safeDatabaseName}\``);

    console.log('[reset-db] Creating schema_migrations table...');
    await connection.query(`
      CREATE TABLE schema_migrations (
        migration_name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Read and run migrations
    const migrationsDir = path.resolve(__dirname, '../database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        console.log(`[reset-db] Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await connection.query(sql);
        await connection.query('INSERT INTO schema_migrations (migration_name) VALUES (?)', [file]);
      }
    }

    // Run baseline seeds
    const baselineSeedPath = path.resolve(__dirname, '../database/seeds/baseline.sql');
    if (fs.existsSync(baselineSeedPath)) {
      console.log('[reset-db] Seeding baseline data...');
      const seedSql = fs.readFileSync(baselineSeedPath, 'utf8');
      await connection.query(seedSql);
      console.log('[reset-db] Baseline data seeded successfully.');
    }

    console.log('[reset-db] Database reset completed successfully.');
  } catch (error) {
    console.error('[reset-db] Error during database reset:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Execute if run directly from CLI
if (require.main === module) {
  resetDatabase();
}
