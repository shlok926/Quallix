import { test, expect } from '../../src/fixtures';
import { ConfigManager } from '../../src/utils/config';

test.describe('End-to-End Sales Assist Rep Workflow', () => {
  test('@smoke @e2e should complete the full lifecycle from login to lead action planning', async ({
    loginPage,
    dashboardPage,
    contactsPage,
    contactDetailPage,
  }) => {
    // 1. Visit the Login screen
    await loginPage.navigate();
    await loginPage.verifyUrl();

    // 2. Perform Login
    await loginPage.login(ConfigManager.testUserEmail, ConfigManager.testUserPassword);

    // 3. Verify Landing on Dashboard
    await dashboardPage.verifyUrl();
    await expect(dashboardPage.welcomeMessage).toContainText('Welcome to Platione Sales Assist');
    expect(await dashboardPage.navbar.getUsername()).toBe('QA Admin User');

    // 4. Navigate to Contacts list via Sidebar
    await dashboardPage.sidebar.navigateToContacts();
    await contactsPage.verifyUrl();

    // 5. Click on the contact 'John Connor' in the table to view details
    await contactsPage.clickContactByName('John Connor');
    await contactDetailPage.verifyUrl();

    // 6. Verify Contact profile header info
    expect(await contactDetailPage.getContactName()).toBe('John Connor');
    expect(await contactDetailPage.contactCompany).toContainText('Resistance');
    expect(await contactDetailPage.getLeadScore()).toBe(80);

    // 7. Update Lead score details
    await contactDetailPage.updateLeadDetails(95, 'qualified');
    expect(await contactDetailPage.getLeadScore()).toBe(95);

    // 8. Add a planned action for the lead
    await contactDetailPage.openAddActionModal();
    await contactDetailPage.fillActionForm({
      type: 'call',
      dueDate: '2026-06-25',
      notes: 'Finalize discount criteria with champion',
    });
    await contactDetailPage.submitActionForm();

    // 9. Confirm action modal closes and action is recorded
    await expect(contactDetailPage.addActionModal.container).toBeHidden();
    const actionCount = await contactDetailPage.actionsTable.getRowCount();
    expect(actionCount).toBe(1);
  });
});
