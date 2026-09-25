import { test, expect } from '@playwright/test';
import { ConfigManager } from '../../src/utils/config';
import { DatabaseSafetyGuard, DatabaseSafetyError } from '../../src/utils/db-safety';

test.describe('FIX-04 — Configuration & Credential Hardening Tests', () => {
  const originalEnv = { ...process.env };

  test.afterEach(() => {
    // Restore environment variables after each test to prevent test leakage
    process.env = { ...originalEnv };
  });

  // ---------------------------------------------------------------------------
  // 1. Sensitive Credential Fail-Closed Validation
  // ---------------------------------------------------------------------------
  test('@security @api Test 1 — should throw descriptive error when TEST_USER_PASSWORD is missing (Fail-Closed)', () => {
    delete process.env.TEST_USER_PASSWORD;

    expect(() => ConfigManager.testUserPassword).toThrow(
      /Missing required configuration environment variable: TEST_USER_PASSWORD/
    );
  });

  test('@security @api Test 2 — should throw descriptive error when TEST_USER_PASSWORD is an empty string', () => {
    process.env.TEST_USER_PASSWORD = '';

    expect(() => ConfigManager.testUserPassword).toThrow(
      /Missing required configuration environment variable: TEST_USER_PASSWORD/
    );
  });

  test('@security @api Test 3 — should never fall back to hardcoded default password when TEST_USER_PASSWORD is unset', () => {
    delete process.env.TEST_USER_PASSWORD;

    let accessedValue = '';
    try {
      accessedValue = ConfigManager.testUserPassword;
    } catch {
      // Expected throw
    }

    expect(accessedValue).not.toBe('QA_Password123');
    expect(accessedValue).not.toBe('password123');
    expect(accessedValue).toBe('');
  });

  test('@security @api Test 4 — should throw descriptive error when TEST_USER_EMAIL is missing', () => {
    delete process.env.TEST_USER_EMAIL;

    expect(() => ConfigManager.testUserEmail).toThrow(
      /Missing required configuration environment variable: TEST_USER_EMAIL/
    );
  });

  test('@security @api Test 5 — should successfully return TEST_USER_PASSWORD and TEST_USER_EMAIL when explicitly configured', () => {
    process.env.TEST_USER_EMAIL = 'custom-qa@platione.com';
    process.env.TEST_USER_PASSWORD = 'CustomSecureSecret987!';

    expect(ConfigManager.testUserEmail).toBe('custom-qa@platione.com');
    expect(ConfigManager.testUserPassword).toBe('CustomSecureSecret987!');
  });

  // ---------------------------------------------------------------------------
  // 2. Safe Non-Sensitive Development Defaults Preservation
  // ---------------------------------------------------------------------------
  test('@security @api Test 6 — should retain safe development defaults for non-sensitive settings', () => {
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.APP_BASE_URL;
    delete process.env.API_BASE_URL;

    expect(ConfigManager.dbHost).toBe('localhost');
    expect(ConfigManager.dbPort).toBe(3306);
    expect(ConfigManager.dbName).toBe('platione_test');
    expect(ConfigManager.appBaseUrl).toBe('http://localhost:4200');
    expect(ConfigManager.apiBaseUrl).toBe('http://localhost:8080');
  });

  test('@security @api Test 7 — should not fall back to fake hardcoded credentials for DB_PASSWORD', () => {
    delete process.env.DB_PASSWORD;

    expect(ConfigManager.dbPassword).not.toBe('your_db_password_here');
    expect(ConfigManager.dbPassword).toBe('');
  });

  // ---------------------------------------------------------------------------
  // 3. FIX-01 Database Reset Safety Boundary Compatibility
  // ---------------------------------------------------------------------------
  test('@security @api Test 8 — FIX-01 DatabaseSafetyGuard remains strictly enforced alongside hardened config', () => {
    // Production environment must remain blocked
    expect(() =>
      DatabaseSafetyGuard.assertResetAllowed({
        environment: 'production',
        databaseName: ConfigManager.dbName,
        isConfirmed: true,
      })
    ).toThrow(DatabaseSafetyError);

    // Unsafe database name must remain blocked
    expect(() =>
      DatabaseSafetyGuard.assertResetAllowed({
        environment: 'qa',
        databaseName: 'production_database',
        isConfirmed: true,
      })
    ).toThrow(DatabaseSafetyError);

    // Missing confirmation must remain blocked
    expect(() =>
      DatabaseSafetyGuard.assertResetAllowed({
        environment: 'qa',
        databaseName: 'platione_test',
        isConfirmed: false,
      })
    ).toThrow(DatabaseSafetyError);
  });
});
