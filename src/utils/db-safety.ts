export interface ResetSafetyCheckParams {
  environment?: string;
  databaseName?: string;
  isConfirmed?: boolean;
}

export interface ResetSafetyResult {
  isSafe: boolean;
  reason?: string;
}

export class DatabaseSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseSafetyError';
  }
}

export class DatabaseSafetyGuard {
  /**
   * Allowed execution environments where destructive reset is permitted.
   */
  public static readonly ALLOWED_ENVIRONMENTS: readonly string[] = ['local', 'test', 'qa'];

  /**
   * Allowed database names specifically reserved for testing and local development.
   */
  public static readonly ALLOWED_DB_NAMES: readonly string[] = [
    'platione_test',
    'platione_qa',
    'platione_local',
  ];

  /**
   * Explicitly forbidden environment patterns and database name keywords.
   */
  public static readonly FORBIDDEN_KEYWORDS: readonly string[] = [
    'prod',
    'production',
    'prod-like',
    'staging',
    'stage',
    'live',
    'master',
    'main',
  ];

  /**
   * Validates whether a database reset operation is permitted based on
   * environment, database name, and explicit confirmation.
   * Fail-Closed: Any missing, ambiguous, or unapproved parameter returns isSafe: false.
   */
  public static validateResetSafety(params: ResetSafetyCheckParams): ResetSafetyResult {
    const rawEnv = params.environment?.trim().toLowerCase();
    const rawDb = params.databaseName?.trim().toLowerCase();
    const isConfirmed = Boolean(params.isConfirmed);

    // 1. Fail Closed on missing environment
    if (!rawEnv) {
      return {
        isSafe: false,
        reason: 'Execution environment is missing or undefined. Destruction is blocked by default.',
      };
    }

    // 2. Reject explicitly forbidden environment keywords
    if (this.FORBIDDEN_KEYWORDS.includes(rawEnv)) {
      return {
        isSafe: false,
        reason: `Destructive reset is strictly forbidden in protected environment: "${rawEnv}".`,
      };
    }

    // 3. Reject environments not in the strict allowlist
    if (!this.ALLOWED_ENVIRONMENTS.includes(rawEnv)) {
      return {
        isSafe: false,
        reason: `Environment "${rawEnv}" is not authorized. Allowed environments: [${this.ALLOWED_ENVIRONMENTS.join(', ')}].`,
      };
    }

    // 4. Fail Closed on missing database name
    if (!rawDb) {
      return {
        isSafe: false,
        reason: 'Target database name is missing or undefined.',
      };
    }

    // 5. Reject forbidden keywords in database name
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      if (rawDb === keyword || rawDb.startsWith(`${keyword}_`) || rawDb.endsWith(`_${keyword}`) || rawDb.includes(`_${keyword}_`)) {
        return {
          isSafe: false,
          reason: `Target database "${rawDb}" contains forbidden production/staging keyword "${keyword}".`,
        };
      }
    }

    // 6. Validate database against approved allowlist or strict test naming pattern
    const isAllowlisted = this.ALLOWED_DB_NAMES.includes(rawDb);
    const isSafePattern = (rawDb.startsWith('platione_') || rawDb.startsWith('test_')) &&
      (rawDb.endsWith('_test') || rawDb.endsWith('_qa') || rawDb.endsWith('_local'));

    if (!isAllowlisted && !isSafePattern) {
      return {
        isSafe: false,
        reason: `Database "${rawDb}" is not an authorized test database. Must match approved naming pattern or allowlist: [${this.ALLOWED_DB_NAMES.join(', ')}].`,
      };
    }

    // 7. Check for explicit destructive confirmation
    if (!isConfirmed) {
      return {
        isSafe: false,
        reason: 'Missing explicit confirmation flag. Pass "--confirm" or set CONFIRM_DB_RESET=true to proceed.',
      };
    }

    return { isSafe: true };
  }

  /**
   * Asserts that reset is allowed; throws DatabaseSafetyError if unsafe.
   */
  public static assertResetAllowed(params: ResetSafetyCheckParams): void {
    const result = this.validateResetSafety(params);
    if (!result.isSafe) {
      throw new DatabaseSafetyError(result.reason || 'Database reset rejected due to safety policy.');
    }
  }
}
