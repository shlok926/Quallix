import { expect, APIResponse } from '@playwright/test';

export class APIResponseValidatorClass {
  /**
   * Asserts the response status code matches the expected code.
   */
  expectStatus(response: APIResponse, expectedStatus: number): void {
    expect(response.status()).toBe(expectedStatus);
  }

  /**
   * Asserts that the response is a JSON object matching an expected subset.
   */
  async expectBodyToMatch(response: APIResponse, expectedSubset: Record<string, unknown>): Promise<void> {
    const body = await response.json();
    expect(body).toMatchObject(expectedSubset);
  }

  /**
   * Asserts that the response matches a contact entity shape.
   */
  async expectContactShape(response: APIResponse): Promise<void> {
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(typeof body.id).toBe('string');
    expect(body).toHaveProperty('name');
    expect(typeof body.name).toBe('string');
    expect(body).toHaveProperty('phone');
    expect(typeof body.phone).toBe('string');
    expect(body).toHaveProperty('email');
    expect(body.email === null || typeof body.email === 'string').toBe(true);
    expect(body).toHaveProperty('company');
    expect(typeof body.company).toBe('string');
    expect(body).toHaveProperty('status');
    expect(['active', 'inactive', 'archived']).toContain(body.status);
  }

  /**
   * Asserts that the response matches a paginated payload shape.
   */
  async expectPaginatedResponse(response: APIResponse): Promise<void> {
    const body = await response.json();
    expect(body).toHaveProperty('content');
    expect(Array.isArray(body.content)).toBe(true);
    expect(body).toHaveProperty('page');
    expect(typeof body.page).toBe('number');
    expect(body).toHaveProperty('size');
    expect(typeof body.size).toBe('number');
    expect(body).toHaveProperty('total');
    expect(typeof body.total).toBe('number');
  }

  /**
   * Asserts that the response matches an action entity shape.
   */
  async expectActionShape(response: APIResponse): Promise<void> {
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(typeof body.id).toBe('string');
    expect(body).toHaveProperty('contact_id');
    expect(body).toHaveProperty('type');
    expect(['call', 'email', 'meeting', 'task']).toContain(body.type);
    expect(body).toHaveProperty('status');
    expect(['pending', 'completed', 'cancelled']).toContain(body.status);
    expect(body).toHaveProperty('due_date');
  }

  /**
   * Asserts that the response contains error details matching the code and message.
   */
  async expectErrorResponse(response: APIResponse, expectedStatus: number, expectedMessage?: string): Promise<void> {
    this.expectStatus(response, expectedStatus);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    if (expectedMessage) {
      expect(body.error).toContain(expectedMessage);
    }
  }
}

export const APIResponseValidator = new APIResponseValidatorClass();
