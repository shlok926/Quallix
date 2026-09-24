import { test, expect } from '../../../src/fixtures';
import { ContactFactory } from '../../../src/data/factories/contact.factory';
import { APIResponseValidator } from '../../../src/api/validators/response.validator';
import { mockAPIServer } from '../../../src/api/mock/mock-api-server';

test.describe('Contact Creation API Tests', () => {
  test.beforeEach(async () => {
    mockAPIServer.resetStore();
  });
  test('@smoke @api POST /api/v1/contacts should create a new contact successfully', async ({ contactClient }) => {
    // 1. Build a valid contact payload using the factory
    const payload = ContactFactory.build({
      name: 'Smoke Test User',
      company: 'Smoke Systems',
    });

    // 2. Perform the API call to create the contact
    const response = await contactClient.createContact(payload);

    // 3. Run validations
    APIResponseValidator.expectStatus(response, 201);
    await APIResponseValidator.expectContactShape(response);
    await APIResponseValidator.expectBodyToMatch(response, {
      name: 'Smoke Test User',
      company: 'Smoke Systems',
      status: 'active',
    });
  });

  test('@smoke @api POST /api/v1/contacts with duplicate phone number should fail in validation', async ({ contactClient, contactSeeder }) => {
    // 1. Seed an initial contact with a dedicated test phone
    const seedPayload = ContactFactory.build({
      name: 'Primary Contact',
      company: 'Primary Corp',
    });
    const seededContact = await contactSeeder.seed(seedPayload);
    expect(seededContact.id).toBeDefined();

    // 2. Attempt to create a second contact with the identical phone number
    const duplicatePayload = ContactFactory.build({
      name: 'Secondary Duplicate Contact',
      phone: seedPayload.phone,
      company: 'Secondary Corp',
    });
    
    // 3. Execute duplicate creation request
    const response = await contactClient.createContact(duplicatePayload);

    // 4. Assert 409 Conflict rejection with descriptive error payload
    await APIResponseValidator.expectErrorResponse(
      response,
      409,
      `Contact with phone ${seedPayload.phone} already exists`
    );

    // 5. Verify the duplicate was not persisted
    const listResponse = await contactClient.listContacts();
    const listBody = await listResponse.json();
    const matchingContacts = listBody.content.filter((c: { phone: string }) => c.phone === seedPayload.phone);
    expect(matchingContacts.length).toBe(1);
    expect(matchingContacts[0].id).toBe(seededContact.id);
  });
});
