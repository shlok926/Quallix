import dotenv from 'dotenv';
import path from 'path';

// Load environment variables. Default to root .env if DOTENV_CONFIG_PATH is not defined.
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../.env') });

export class ConfigManager {
  /**
   * Helper to retrieve a key or throw a descriptive error (Fail-Closed).
   */
  public static getOrThrow(key: string): string {
    const value = process.env[key];
    if (value === undefined || value === '') {
      throw new Error(`Missing required configuration environment variable: ${key}`);
    }
    return value;
  }

  /**
   * Helper to retrieve a key or return a safe default fallback.
   */
  public static getOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  static get appBaseUrl(): string {
    return this.getOrDefault('APP_BASE_URL', 'http://localhost:4200');
  }

  static get apiBaseUrl(): string {
    return this.getOrDefault('API_BASE_URL', 'http://localhost:8080');
  }

  static get dbHost(): string {
    return this.getOrDefault('DB_HOST', 'localhost');
  }

  static get dbPort(): number {
    return parseInt(this.getOrDefault('DB_PORT', '3306'), 10);
  }

  static get dbName(): string {
    return this.getOrDefault('DB_NAME', 'platione_test');
  }

  static get dbUser(): string {
    return this.getOrDefault('DB_USER', 'qa_user');
  }

  /**
   * Database password: returns explicitly configured DB_PASSWORD or empty string (standard for local dev).
   * Never falls back to hardcoded fake/privileged passwords.
   */
  static get dbPassword(): string {
    return process.env.DB_PASSWORD || '';
  }

  /**
   * Test User Email: Required for authenticated flows. Fails closed if missing.
   */
  static get testUserEmail(): string {
    return this.getOrThrow('TEST_USER_EMAIL');
  }

  /**
   * Test User Password: Required for authenticated flows. Fails closed if missing.
   * Never falls back to hardcoded or default credentials.
   */
  static get testUserPassword(): string {
    return this.getOrThrow('TEST_USER_PASSWORD');
  }

  static get logLevel(): string {
    return this.getOrDefault('LOG_LEVEL', 'info');
  }

  static get environment(): string {
    return this.getOrDefault('ENVIRONMENT', 'qa');
  }
}
