import { test, expect } from '../../../src/fixtures';
import { ActionFactory } from '../../../src/data/factories/action.factory';
import { ContactFactory } from '../../../src/data/factories/contact.factory';
import { APIResponseValidator } from '../../../src/api/validators/response.validator';
import { ActionResponse } from '../../../src/types';
import { mockAPIServer } from '../../../src/api/mock/mock-api-server';

test.describe('Action API Contract Tests (QX-009 / FIX-03)', () => {
  test.beforeEach(async () => {
    // Reset mock store before each test for deterministic data isolation
    mockAPIServer.resetStore();
  });
  // ---------------------------------------------------------------------------
  // Test 1: POST /api/v1/actions (Creation)
  // ---------------------------------------------------------------------------
  test('@smoke @api POST /api/v1/actions should create an action associated with a contact', async ({
    actionClient,
    contactClient,
  }) => {
    // 1. Create a parent contact
    const contactPayload = ContactFactory.build();
    const contactRes = await contactClient.createContact(contactPayload);
    const contact = await contactRes.json();

    // 2. Build action payload associated with contact ID
    const actionPayload = ActionFactory.build({
      contact_id: contact.id,
      type: 'call',
      status: 'pending',
      priority: 'high',
      notes: 'Initial introductory outreach call',
    });

    // 3. Create action via API
    const response = await actionClient.createAction(actionPayload);

    // 4. Validate response status and entity structure
    APIResponseValidator.expectStatus(response, 201);
    await APIResponseValidator.expectActionShape(response);
    await APIResponseValidator.expectBodyToMatch(response, {
      contact_id: contact.id,
      type: 'call',
      status: 'pending',
      priority: 'high',
      notes: 'Initial introductory outreach call',
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: GET /api/v1/contacts/:contactId/actions (Retrieval)
  // ---------------------------------------------------------------------------
  test('@smoke @api GET /api/v1/contacts/:contactId/actions should return all actions for the contact', async ({
    actionClient,
    contactClient,
  }) => {
    // 1. Create parent contact
    const contactPayload = ContactFactory.build();
    const contactRes = await contactClient.createContact(contactPayload);
    const contact = await contactRes.json();

    // 2. Create 2 actions for this contact
    const action1Payload = ActionFactory.build({ contact_id: contact.id, type: 'call' });
    const action2Payload = ActionFactory.build({ contact_id: contact.id, type: 'meeting' });

    const res1 = await actionClient.createAction(action1Payload);
    const res2 = await actionClient.createAction(action2Payload);
    const action1 = (await res1.json()) as ActionResponse;
    const action2 = (await res2.json()) as ActionResponse;

    // 3. Retrieve actions for the contact
    const listResponse = await actionClient.getActionsForContact(contact.id);
    APIResponseValidator.expectStatus(listResponse, 200);

    const actions = (await listResponse.json()) as ActionResponse[];
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBe(2);

    const actionIds = actions.map((a) => a.id);
    expect(actionIds).toContain(action1.id);
    expect(actionIds).toContain(action2.id);

    for (const a of actions) {
      expect(String(a.contact_id)).toBe(String(contact.id));
    }
  });

  // ---------------------------------------------------------------------------
  // Test 3: Contact Isolation (No Cross-Contact Action Leaks)
  // ---------------------------------------------------------------------------
  test('@regression @api GET /api/v1/contacts/:contactId/actions should strictly isolate actions by contact', async ({
    actionClient,
    contactClient,
  }) => {
    // 1. Create Contact A and Contact B
    const contactARes = await contactClient.createContact(ContactFactory.build());
    const contactA = await contactARes.json();

    const contactBRes = await contactClient.createContact(ContactFactory.build());
    const contactB = await contactBRes.json();

    // 2. Create Action A for Contact A, and Action B for Contact B
    const actionARes = await actionClient.createAction(
      ActionFactory.build({ contact_id: contactA.id, notes: 'Action for Contact A' })
    );
    const actionBRes = await actionClient.createAction(
      ActionFactory.build({ contact_id: contactB.id, notes: 'Action for Contact B' })
    );

    const actionA = (await actionARes.json()) as ActionResponse;
    const actionB = (await actionBRes.json()) as ActionResponse;

    // 3. Fetch actions for Contact A only
    const resA = await actionClient.getActionsForContact(contactA.id);
    const actionsA = (await resA.json()) as ActionResponse[];

    const idsA = actionsA.map((a) => a.id);
    expect(idsA).toContain(actionA.id);
    expect(idsA).not.toContain(actionB.id);

    // 4. Fetch actions for Contact B only
    const resB = await actionClient.getActionsForContact(contactB.id);
    const actionsB = (await resB.json()) as ActionResponse[];

    const idsB = actionsB.map((a) => a.id);
    expect(idsB).toContain(actionB.id);
    expect(idsB).not.toContain(actionA.id);
  });

  // ---------------------------------------------------------------------------
  // Test 4: PATCH /api/v1/actions/:id/status (Status Update)
  // ---------------------------------------------------------------------------
  test('@smoke @api PATCH /api/v1/actions/:id/status should update action status and preserve other fields', async ({
    actionClient,
    contactClient,
  }) => {
    // 1. Create parent contact and initial pending action
    const contactRes = await contactClient.createContact(ContactFactory.build());
    const contact = await contactRes.json();

    const initialPayload = ActionFactory.build({
      contact_id: contact.id,
      type: 'email',
      status: 'pending',
      priority: 'high',
      notes: 'Follow-up email proposal',
    });

    const createRes = await actionClient.createAction(initialPayload);
    const createdAction = (await createRes.json()) as ActionResponse;
    expect(createdAction.status).toBe('pending');

    // 2. Update status to completed via PATCH
    const patchResponse = await actionClient.updateStatus(createdAction.id, 'completed');
    APIResponseValidator.expectStatus(patchResponse, 200);

    const updatedAction = (await patchResponse.json()) as ActionResponse;
    expect(updatedAction.id).toBe(createdAction.id);
    expect(updatedAction.status).toBe('completed');
    expect(updatedAction.contact_id).toBe(createdAction.contact_id);
    expect(updatedAction.type).toBe('email');
    expect(updatedAction.priority).toBe('high');
    expect(updatedAction.notes).toBe('Follow-up email proposal');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Persistence After PATCH (Stateful Verification)
  // ---------------------------------------------------------------------------
  test('@regression @api PATCH /api/v1/actions/:id/status should persist changes in GET contact actions', async ({
    actionClient,
    contactClient,
  }) => {
    // 1. Setup contact with action
    const contactRes = await contactClient.createContact(ContactFactory.build());
    const contact = await contactRes.json();

    const createRes = await actionClient.createAction(
      ActionFactory.build({ contact_id: contact.id, status: 'pending' })
    );
    const createdAction = (await createRes.json()) as ActionResponse;

    // 2. Patch status to cancelled
    const patchRes = await actionClient.updateStatus(createdAction.id, 'cancelled');
    APIResponseValidator.expectStatus(patchRes, 200);

    // 3. Query contact actions list to confirm persistence
    const listRes = await actionClient.getActionsForContact(contact.id);
    const actions = (await listRes.json()) as ActionResponse[];

    const persistedAction = actions.find((a) => a.id === createdAction.id);
    expect(persistedAction).toBeDefined();
    expect(persistedAction?.status).toBe('cancelled');
  });

  // ---------------------------------------------------------------------------
  // Test 6: PATCH on Non-existent Action ID (Error Contract)
  // ---------------------------------------------------------------------------
  test('@regression @api PATCH /api/v1/actions/:id/status should return 404 for invalid action ID', async ({
    actionClient,
  }) => {
    const nonExistentActionId = 'non-existent-action-uuid-99999';
    const response = await actionClient.updateStatus(nonExistentActionId, 'completed');

    await APIResponseValidator.expectErrorResponse(
      response,
      404,
      `Action with ID ${nonExistentActionId} not found`
    );
  });

  // ---------------------------------------------------------------------------
  // Test 7: GET actions for Contact without Actions (Empty List)
  // ---------------------------------------------------------------------------
  test('@regression @api GET /api/v1/contacts/:contactId/actions should return empty array for contact with no actions', async ({
    actionClient,
    contactClient,
  }) => {
    const contactRes = await contactClient.createContact(ContactFactory.build());
    const contact = await contactRes.json();

    const listRes = await actionClient.getActionsForContact(contact.id);
    APIResponseValidator.expectStatus(listRes, 200);

    const actions = await listRes.json();
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBe(0);
  });
});
