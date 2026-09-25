import { test, expect } from '../../src/fixtures';
import { AuthUtils } from '../../src/utils/auth';
import { BaseAPIClient } from '../../src/api/clients/base.api-client';

test.describe('Security Regression — Authentication & Token Security (SEC-AUTH)', () => {
  // ---------------------------------------------------------------------------
  // 1. JWT Token Structure & Encoding
  // ---------------------------------------------------------------------------
  test('@security @api SEC-AUTH-01 — should generate properly structured base64url JWT with required claims', () => {
    const email = 'sec-user@platione.com';
    const role = 'sales_rep';
    const token = AuthUtils.generateMockToken(email, role);

    expect(token).toBeDefined();
    const parts = token.split('.');
    expect(parts.length).toBe(3); // header.payload.signature

    const payload = AuthUtils.decodeMockToken(token);
    expect(payload).not.toBeNull();
    expect(payload.sub).toBe(email);
    expect(payload.role).toBe(role);
    expect(typeof payload.exp).toBe('number');
    expect(typeof payload.iat).toBe('number');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  // ---------------------------------------------------------------------------
  // 2. Token Decoding & Malformed Token Fail-Safe
  // ---------------------------------------------------------------------------
  test('@security @api SEC-AUTH-02 — decodeMockToken should fail-safe and return null on malformed tokens', () => {
    const malformedTokens = [
      '',
      'not-a-jwt',
      'header.only',
      'invalid.base64-payload.signature',
      'eyJhbGciOiJIUzI1NiJ9.invalid-json-content.signature',
    ];

    for (const badToken of malformedTokens) {
      const decoded = AuthUtils.decodeMockToken(badToken);
      expect(decoded).toBeNull();
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Token Expiry & Active Status Verification
  // ---------------------------------------------------------------------------
  test('@security @api SEC-AUTH-03 — isTokenExpired should correctly identify valid active tokens', () => {
    const activeToken = AuthUtils.generateMockToken('active@platione.com', 'admin');
    expect(AuthUtils.isTokenExpired(activeToken)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 4. Token Expiry Fail-Closed on Expired & Corrupted Tokens
  // ---------------------------------------------------------------------------
  test('@security @api SEC-AUTH-04 — isTokenExpired should fail closed (return true) for expired and corrupt tokens', () => {
    // 1. Manually craft expired token (exp in the past)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const pastPayload = Buffer.from(
      JSON.stringify({
        sub: 'expired@platione.com',
        role: 'user',
        exp: Math.floor(Date.now() / 1000) - 300, // Expired 5 minutes ago
        iat: Math.floor(Date.now() / 1000) - 3600,
      })
    ).toString('base64url');
    const expiredToken = `${header}.${pastPayload}.mock_signature`;

    expect(AuthUtils.isTokenExpired(expiredToken)).toBe(true);

    // 2. Corrupt / invalid tokens must fail closed as expired/invalid
    expect(AuthUtils.isTokenExpired('malformed-token')).toBe(true);
    expect(AuthUtils.isTokenExpired('')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5. BaseAPIClient Authorization Header Isolation
  // ---------------------------------------------------------------------------
  test('@security @api SEC-AUTH-05 — BaseAPIClient should attach Authorization header only when token is set', async ({ request }) => {
    class TestClient extends BaseAPIClient {
      public exposeHeaders(): Record<string, string> {
        return this.getHeaders();
      }
    }

    const unauthClient = new TestClient(request);
    const unauthHeaders = unauthClient.exposeHeaders();
    expect(unauthHeaders['Authorization']).toBeUndefined();
    expect(unauthHeaders['Content-Type']).toBe('application/json');

    const authClient = new TestClient(request);
    authClient.setAuthToken('mock-jwt-token-xyz');
    const authHeaders = authClient.exposeHeaders();
    expect(authHeaders['Authorization']).toBe('Bearer mock-jwt-token-xyz');
  });

  // ---------------------------------------------------------------------------
  // 6. Mock Authentication Endpoints (Login / Logout Lifecycle)
  // ---------------------------------------------------------------------------
  test('@security @api SEC-AUTH-06 — AuthAPIClient should successfully execute login and logout contracts', async ({ authClient }) => {
    const loginResponse = await authClient.login({
      email: 'qa@platione.com',
      password: 'validPassword123',
    });
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    expect(loginData).toHaveProperty('token');
    expect(typeof loginData.token).toBe('string');

    const logoutResponse = await authClient.logout();
    expect(logoutResponse.status()).toBe(204);
  });
});
