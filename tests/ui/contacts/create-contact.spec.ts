import { test, expect } from '../../../src/fixtures';
import { ContactFactory } from '../../../src/data/factories/contact.factory';

test.describe('Contacts UI Tests', () => {
  test.beforeEach(async ({ contactsPage }) => {
    // Navigate to the contacts list page directly
    await contactsPage.navigate();
  });

  test('@regression @ui should display contact list and create new contact successfully', async ({ contactsPage }) => {
    // 1. Verify we are on the correct page
    await contactsPage.verifyUrl();

    // 2. Verify baseline contact exists in table
    const initialCount = await contactsPage.contactsTable.getRowCount();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    const firstRowName = await contactsPage.contactsTable.getCellValue(0, 0);
    expect(firstRowName).toBe('John Connor');

    // 3. Build unique test data using factory to prevent test collisions
    const newContact = ContactFactory.build({
      name: 'Sarah Connor',
      company: 'Resistance HQ',
      email: 'sconnor@resistance.net',
      status: 'active',
    });

    // 4. Open modal and fill out form
    await contactsPage.openCreateModal();
    await contactsPage.fillCreateForm({
      name: newContact.name,
      phone: newContact.phone,
      company: newContact.company,
      email: newContact.email,
      status: newContact.status,
    });

    // 5. Submit form
    await contactsPage.submitCreateForm();

    // 6. Verify modal disappears
    await expect(contactsPage.createModal.container).toBeHidden();

    // 7. Verify actual contact creation in UI: table row count increases
    const updatedCount = await contactsPage.contactsTable.getRowCount();
    expect(updatedCount).toBe(initialCount + 1);

    // 8. Verify the created contact data is accurately rendered in the table
    const createdRowIndex = initialCount;
    const renderedName = await contactsPage.contactsTable.getCellValue(createdRowIndex, 0);
    const renderedCompany = await contactsPage.contactsTable.getCellValue(createdRowIndex, 1);

    expect(renderedName).toBe(newContact.name);
    expect(renderedCompany).toBe(newContact.company);
  });
});
