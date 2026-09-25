import { test, expect } from '@playwright/test';
import {
  DatabaseSafetyGuard,
  DatabaseSafetyError,
} from '../../src/utils/db-safety';

test.describe('FIX-01 — Database Reset Safety Boundary Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. Positive Tests (Safe Environments & Approved Parameters)
  // ---------------------------------------------------------------------------
  test('@security @api Test 1 — should permit reset when environment, database name, and confirmation are valid', () => {
    const validParams = [
      { environment: 'qa', databaseName: 'platione_test', isConfirmed: true },
      { environment: 'test', databaseName: 'platione_qa', isConfirmed: true },
      { environment: 'local', databaseName: 'platione_local', isConfirmed: true },
      { environment: ' QA ', databaseName: 'platione_test', isConfirmed: true }, // trimmed / case-insensitive
    ];

    for (const params of validParams) {
      const result = DatabaseSafetyGuard.validateResetSafety(params);
      expect(result.isSafe).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(() => DatabaseSafetyGuard.assertResetAllowed(params)).not.toThrow();
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Negative Tests (Safety Rejections — Negative Paths First)
  // ---------------------------------------------------------------------------
  test('@security @api Test 2 — should block reset in production and prod-like environments', () => {
    const prodEnvironments = ['production', 'prod', 'prod-like', 'live'];

    for (const env of prodEnvironments) {
      const result = DatabaseSafetyGuard.validateResetSafety({
        environment: env,
        databaseName: 'platione_test',
        isConfirmed: true,
      });

      expect(result.isSafe).toBe(false);
      expect(result.reason).toContain('forbidden');
      expect(() =>
        DatabaseSafetyGuard.assertResetAllowed({
          environment: env,
          databaseName: 'platione_test',
          isConfirmed: true,
        })
      ).toThrow(DatabaseSafetyError);
    }
  });

  test('@security @api Test 3 — should block reset in staging environments', () => {
    const stagingEnvironments = ['staging', 'stage'];

    for (const env of stagingEnvironments) {
      const result = DatabaseSafetyGuard.validateResetSafety({
        environment: env,
        databaseName: 'platione_test',
        isConfirmed: true,
      });

      expect(result.isSafe).toBe(false);
      expect(result.reason).toContain('forbidden');
    }
  });

  test('@security @api Test 4 — should fail closed when environment is missing, empty, or undefined', () => {
    const invalidEnvs = [undefined, '', '   ', null as unknown as string];

    for (const env of invalidEnvs) {
      const result = DatabaseSafetyGuard.validateResetSafety({
        environment: env,
        databaseName: 'platione_test',
        isConfirmed: true,
      });

      expect(result.isSafe).toBe(false);
      expect(result.reason).toContain('missing or undefined');
      expect(() =>
        DatabaseSafetyGuard.assertResetAllowed({
          environment: env,
          databaseName: 'platione_test',
          isConfirmed: true,
        })
      ).toThrow(DatabaseSafetyError);
    }
  });

  test('@security @api Test 5 — should reject unknown / unapproved environments', () => {
    const unknownEnvs = ['dev-preview', 'sandbox', 'custom_env', 'uat'];

    for (const env of unknownEnvs) {
      const result = DatabaseSafetyGuard.validateResetSafety({
        environment: env,
        databaseName: 'platione_test',
        isConfirmed: true,
      });

      expect(result.isSafe).toBe(false);
      expect(result.reason).toContain('not authorized');
    }
  });

  test('@security @api Test 6 — should block reset if database name targets production, staging, or unapproved names', () => {
    const unsafeDatabases = [
      'production_crm',
      'platione_prod',
      'platione_staging',
      'master',
      'live_sales',
      'random_customer_data',
      undefined,
      '',
    ];

    for (const dbName of unsafeDatabases) {
      const result = DatabaseSafetyGuard.validateResetSafety({
        environment: 'qa',
        databaseName: dbName,
        isConfirmed: true,
      });

      expect(result.isSafe).toBe(false);
      expect(result.reason).toBeDefined();
      expect(() =>
        DatabaseSafetyGuard.assertResetAllowed({
          environment: 'qa',
          databaseName: dbName,
          isConfirmed: true,
        })
      ).toThrow(DatabaseSafetyError);
    }
  });

  test('@security @api Test 7 — should block reset if explicit confirmation flag is missing', () => {
    const unconfirmedParams = [
      { environment: 'qa', databaseName: 'platione_test', isConfirmed: false },
      { environment: 'local', databaseName: 'platione_local', isConfirmed: undefined },
    ];

    for (const params of unconfirmedParams) {
      const result = DatabaseSafetyGuard.validateResetSafety(params);
      expect(result.isSafe).toBe(false);
      expect(result.reason).toContain('Missing explicit confirmation flag');
      expect(() => DatabaseSafetyGuard.assertResetAllowed(params)).toThrow(DatabaseSafetyError);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Destructive Invocation Safety (Ensures Mock DB Query is never executed when blocked)
  // ---------------------------------------------------------------------------
  test('@security @api Test 8 — mock query execution is never called when safety validation fails', async () => {
    let dropQueryExecuted = false;

    const mockDbConnection = {
      query: async (sql: string) => {
        if (sql.includes('DROP DATABASE')) {
          dropQueryExecuted = true;
        }
        return [];
      },
    };

    const unsafeEnv = 'production';
    const safetyCheck = DatabaseSafetyGuard.validateResetSafety({
      environment: unsafeEnv,
      databaseName: 'platione_test',
      isConfirmed: true,
    });

    if (safetyCheck.isSafe) {
      await mockDbConnection.query('DROP DATABASE IF EXISTS platione_test');
    }

    expect(safetyCheck.isSafe).toBe(false);
    expect(dropQueryExecuted).toBe(false);
  });
});
