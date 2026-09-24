import { APIRequestContext, BrowserContext, Page, Route, Request, APIResponse } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { ActionResponse } from '../../types';

export class MockAPIServer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private inMemoryStore = new Map<string, any>();
  private inMemoryActions = new Map<string, ActionResponse>();

  constructor() {}

  /**
   * Resets the mock server storage state.
   */
  resetStore(): void {
    this.inMemoryStore.clear();
    this.inMemoryActions.clear();
  }

  /**
   * Helper to create a mock Playwright APIResponse object.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createMockResponse(status: number, data: any, url: string): APIResponse {
    return {
      status: () => status,
      statusText: () => {
        if (status === 200) return 'OK';
        if (status === 201) return 'Created';
        if (status === 204) return 'No Content';
        if (status === 400) return 'Bad Request';
        if (status === 404) return 'Not Found';
        if (status === 409) return 'Conflict';
        return 'Unknown';
      },
      ok: () => status >= 200 && status < 300,
      url: () => url,
      headers: () => ({ 'content-type': 'application/json' }),
      headersArray: () => [{ name: 'content-type', value: 'application/json' }],
      body: async () => Buffer.from(data ? JSON.stringify(data) : ''),
      text: async () => (data ? JSON.stringify(data) : ''),
      json: async () => {
        if (!data) throw new Error('No JSON in response');
        return data;
      },
      dispose: async () => {},
    } as unknown as APIResponse;
  }

  /**
   * Sets up route interception on a Page, BrowserContext, or APIRequestContext.
   * Intercepts login, contact CRUD, list, and actions endpoints.
   */
  async setupMockRoutes(context: Page | BrowserContext | APIRequestContext): Promise<void> {
    // If mocks are disabled, bypass interception and run against real servers
    if (process.env.USE_MOCKS === 'false') {
      return;
    }

    const hasRouteFunction = 'route' in context && typeof (context as any).route === 'function'; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (hasRouteFunction) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = context as any;

      // === HTML PAGE MOCKS ===
      
      // HTML mock page for /login
      await ctx.route('**/login', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <html>
              <head><title>Login - Platione Sales Assist</title></head>
              <body>
                <div data-testid="login-container">
                  <input data-testid="email-input" id="email" />
                  <input data-testid="password-input" type="password" id="password" />
                  <button data-testid="login-button" onclick="location.href='/dashboard'">Login</button>
                  <div data-testid="error-message" style="display:none">Invalid credentials</div>
                </div>
              </body>
            </html>
          `,
        });
      });

      // HTML mock page for /dashboard
      await ctx.route('**/dashboard', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <html>
              <head><title>Dashboard - Platione Sales Assist</title></head>
              <body>
                <div data-testid="sidebar-container" style="width:200px; float:left;">
                  <a data-testid="nav-dashboard" href="/dashboard">Dashboard</a><br/>
                  <a data-testid="nav-contacts" href="/contacts">Contacts</a><br/>
                  <a data-testid="nav-actions" href="/actions">Actions</a>
                </div>
                <div data-testid="navbar-container" style="float:right;">
                  <div data-testid="username-display">QA Admin User</div>
                  <button data-testid="profile-dropdown" onclick="document.getElementById('logout').style.display='block'">Profile</button>
                  <button id="logout" data-testid="logout-button" style="display:none;" onclick="location.href='/login'">Logout</button>
                </div>
                <div style="margin-left:220px;">
                  <h1 data-testid="welcome-message">Welcome to Platione Sales Assist</h1>
                  <div data-testid="pipeline-chart">Pipeline Chart Graphic</div>
                </div>
              </body>
            </html>
          `,
        });
      });

      // HTML mock page for /contacts
      await ctx.route('**/contacts', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <html>
              <head><title>Contacts - Platione Sales Assist</title></head>
              <body>
                <div data-testid="sidebar-container" style="width:200px; float:left;">
                  <a data-testid="nav-dashboard" href="/dashboard">Dashboard</a><br/>
                  <a data-testid="nav-contacts" href="/contacts">Contacts</a><br/>
                </div>
                <div style="margin-left:220px;">
                  <button data-testid="create-contact-btn" onclick="document.getElementById('modal').style.display='block'">Create Contact</button>
                  <input data-testid="search-bar" placeholder="Search..." />
                  <table data-testid="contacts-table">
                    <thead>
                      <tr><th>Name</th><th>Company</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      <tr onclick="location.href='/contacts/contact-uuid-1'">
                        <td>John Connor</td>
                        <td>Resistance</td>
                        <td><button data-testid="view-btn">View</button></td>
                      </tr>
                    </tbody>
                  </table>
                  <div id="modal" data-testid="create-contact-modal" style="display:none; border:1px solid #ccc; padding:20px;">
                    <div data-testid="modal-title">Create Contact</div>
                    <input data-testid="form-name" placeholder="Name" /><br/>
                    <input data-testid="form-phone" placeholder="Phone" /><br/>
                    <input data-testid="form-company" placeholder="Company" /><br/>
                    <input data-testid="form-email" placeholder="Email" /><br/>
                    <select data-testid="form-status">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select><br/>
                    <button data-testid="modal-confirm" onclick="
                      const name = document.querySelector('[data-testid=form-name]').value;
                      const company = document.querySelector('[data-testid=form-company]').value;
                      if (name) {
                        const tbody = document.querySelector('[data-testid=contacts-table] tbody');
                        const tr = document.createElement('tr');
                        tr.innerHTML = '<td>' + name + '</td><td>' + (company || '') + '</td><td><button data-testid=\\'view-btn\\'>View</button></td>';
                        tbody.appendChild(tr);
                      }
                      document.getElementById('modal').style.display='none';
                    ">Confirm</button>
                    <button data-testid="modal-cancel" onclick="document.getElementById('modal').style.display='none'">Cancel</button>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
      });

      // HTML mock page for /contacts/:id
      await ctx.route(/\/contacts\/[^/]+$/, async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <html>
              <head><title>Contact Details - Platione Sales Assist</title></head>
              <body>
                <div data-testid="sidebar-container" style="width:200px; float:left;">
                  <a data-testid="nav-dashboard" href="/dashboard">Dashboard</a><br/>
                  <a data-testid="nav-contacts" href="/contacts">Contacts</a><br/>
                </div>
                <div style="margin-left:220px;">
                  <h2 data-testid="detail-name">John Connor</h2>
                  <div data-testid="detail-company">Resistance</div>
                  <div>Score: <span data-testid="detail-score">80</span></div>
                  <input data-testid="detail-score-input" value="80" />
                  <select data-testid="detail-stage-select">
                    <option value="prospect">Prospect</option>
                    <option value="qualified">Qualified</option>
                  </select>
                  <button data-testid="update-lead-btn" onclick="document.querySelector('[data-testid=detail-score]').innerText=document.querySelector('[data-testid=detail-score-input]').value">Update</button>
                  <br/><br/>
                  <button data-testid="open-action-modal-btn" onclick="document.getElementById('action-modal').style.display='block'">Add Action</button>
                  <table data-testid="actions-table">
                    <tbody>
                      <tr><td>Call</td><td>Pending</td></tr>
                    </tbody>
                  </table>
                  <div id="action-modal" data-testid="add-action-modal" style="display:none; border:1px solid #ccc; padding:20px;">
                    <div data-testid="modal-title">Add Action</div>
                    <select data-testid="action-type-select">
                      <option value="call">Call</option>
                    </select><br/>
                    <input data-testid="action-duedate-input" type="date" /><br/>
                    <input data-testid="action-notes-input" placeholder="Notes" /><br/>
                    <button data-testid="modal-confirm" onclick="document.getElementById('action-modal').style.display='none'">Confirm</button>
                    <button data-testid="modal-cancel" onclick="document.getElementById('action-modal').style.display='none'">Cancel</button>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
      });

      // === API ROUTE MOCKS ===

      // 1. Intercept POST /api/v1/auth/login
      await ctx.route('**/api/v1/auth/login', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'mock-jwt-token-xyz' }),
        });
      });

      // 2. Intercept POST /api/v1/auth/logout
      await ctx.route('**/api/v1/auth/logout', async (route: Route) => {
        await route.fulfill({ status: 204 });
      });

      // 3. Intercept POST and GET /api/v1/contacts
      await ctx.route('**/api/v1/contacts', async (route: Route, request: Request) => {
        const method = request.method();
        if (method === 'POST') {
          const payload = request.postDataJSON();
          
          // Enforce unique phone constraint
          const existingContacts = Array.from(this.inMemoryStore.values());
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isDuplicate = payload?.phone && existingContacts.some((c: any) => c.phone === payload.phone);
          if (isDuplicate) {
            await route.fulfill({
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({ error: `Contact with phone ${payload.phone} already exists` }),
            });
            return;
          }

          const id = faker.string.uuid();
          const contactResponse = {
            id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...payload,
          };
          this.inMemoryStore.set(id, contactResponse);
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(contactResponse),
          });
        } else if (method === 'GET') {
          const contacts = Array.from(this.inMemoryStore.values());
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              content: contacts,
              page: 0,
              size: 20,
              total: contacts.length,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // 4. Intercept GET, PUT, and DELETE /api/v1/contacts/:id
      await ctx.route(/\/api\/v1\/contacts\/([^/]+)$/, async (route: Route, request: Request) => {
        const url = request.url();
        const match = url.match(/\/api\/v1\/contacts\/([^/]+)$/);
        const id = match ? match[1] : '';
        const method = request.method();

        if (method === 'GET') {
          const contact = this.inMemoryStore.get(id);
          if (contact) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(contact),
            });
          } else {
            await route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({ error: `Contact with ID ${id} not found` }),
            });
          }
        } else if (method === 'PUT') {
          const partialPayload = request.postDataJSON();
          const existing = this.inMemoryStore.get(id);
          if (existing) {
            const updated = {
              ...existing,
              ...partialPayload,
              updated_at: new Date().toISOString(),
            };
            this.inMemoryStore.set(id, updated);
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(updated),
            });
          } else {
            await route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({ error: `Contact with ID ${id} not found` }),
            });
          }
        } else if (method === 'DELETE') {
          const exists = this.inMemoryStore.has(id);
          if (exists) {
            this.inMemoryStore.delete(id);
            await route.fulfill({ status: 204 });
          } else {
            await route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({ error: `Contact with ID ${id} not found` }),
            });
          }
        } else {
          await route.continue();
        }
      });

      // 5. Intercept POST /api/v1/actions
      await ctx.route('**/api/v1/actions', async (route: Route, request: Request) => {
        if (request.method() === 'POST') {
          const payload = request.postDataJSON();
          const id = faker.string.uuid();
          const actionResponse: ActionResponse = {
            id,
            status: 'pending',
            priority: 'medium',
            ...payload,
          };
          this.inMemoryActions.set(id, actionResponse);
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(actionResponse),
          });
        } else {
          await route.continue();
        }
      });

      // 6. Intercept GET /api/v1/contacts/:contactId/actions
      await ctx.route(/\/api\/v1\/contacts\/([^/]+)\/actions$/, async (route: Route, request: Request) => {
        if (request.method() === 'GET') {
          const url = request.url();
          const match = url.match(/\/api\/v1\/contacts\/([^/]+)\/actions$/);
          const contactId = match ? match[1] : '';
          const actions = Array.from(this.inMemoryActions.values()).filter(
            (a) => String(a.contact_id) === String(contactId)
          );
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(actions),
          });
        } else {
          await route.continue();
        }
      });

      // 7. Intercept PATCH /api/v1/actions/:id/status
      await ctx.route(/\/api\/v1\/actions\/([^/]+)\/status$/, async (route: Route, request: Request) => {
        if (request.method() === 'PATCH') {
          const url = request.url();
          const match = url.match(/\/api\/v1\/actions\/([^/]+)\/status$/);
          const id = match ? match[1] : '';
          const payload = request.postDataJSON();
          const existing = this.inMemoryActions.get(id);

          if (!existing) {
            await route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({ error: `Action with ID ${id} not found` }),
            });
            return;
          }

          const updated: ActionResponse = {
            ...existing,
            status: payload?.status,
          };
          this.inMemoryActions.set(id, updated);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(updated),
          });
        } else {
          await route.continue();
        }
      });
    } else {
      // Standalone APIRequestContext — Intercept the .fetch method directly
      const requestContext = context as APIRequestContext;
      const originalFetch = requestContext.fetch.bind(requestContext);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestContext.fetch = async (urlOrRequest: any, options: any = {}) => {
        const url = typeof urlOrRequest === 'string' ? urlOrRequest : urlOrRequest.url();
        const method = (options.method || 'GET').toUpperCase();

        // 1. Match POST /api/v1/auth/login
        if (url.endsWith('/api/v1/auth/login') && method === 'POST') {
          return this.createMockResponse(200, { token: 'mock-jwt-token-xyz' }, url);
        }

        // 2. Match POST /api/v1/auth/logout
        if (url.endsWith('/api/v1/auth/logout') && method === 'POST') {
          return this.createMockResponse(204, null, url);
        }

        // 3. Match POST and GET /api/v1/contacts
        if (url.endsWith('/api/v1/contacts')) {
          if (method === 'POST') {
            const payload = options.data;
            
            // Enforce unique phone constraint
            const existingContacts = Array.from(this.inMemoryStore.values());
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isDuplicate = payload?.phone && existingContacts.some((c: any) => c.phone === payload.phone);
            if (isDuplicate) {
              return this.createMockResponse(409, { error: `Contact with phone ${payload.phone} already exists` }, url);
            }

            const id = faker.string.uuid();
            const contactResponse = {
              id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...payload,
            };
            this.inMemoryStore.set(id, contactResponse);
            return this.createMockResponse(201, contactResponse, url);
          } else if (method === 'GET') {
            const contacts = Array.from(this.inMemoryStore.values());
            return this.createMockResponse(200, {
              content: contacts,
              page: 0,
              size: 20,
              total: contacts.length,
            }, url);
          }
        }

        // 4. Match GET, PUT, and DELETE /api/v1/contacts/:id
        const contactIdMatch = url.match(/\/api\/v1\/contacts\/([^/]+)$/);
        if (contactIdMatch) {
          const id = contactIdMatch[1];
          if (method === 'GET') {
            const contact = this.inMemoryStore.get(id);
            if (contact) {
              return this.createMockResponse(200, contact, url);
            } else {
              return this.createMockResponse(404, { error: `Contact with ID ${id} not found` }, url);
            }
          } else if (method === 'PUT') {
            const partialPayload = options.data;
            const existing = this.inMemoryStore.get(id);
            if (existing) {
              const updated = {
                ...existing,
                ...partialPayload,
                updated_at: new Date().toISOString(),
              };
              this.inMemoryStore.set(id, updated);
              return this.createMockResponse(200, updated, url);
            } else {
              return this.createMockResponse(404, { error: `Contact with ID ${id} not found` }, url);
            }
          } else if (method === 'DELETE') {
            const exists = this.inMemoryStore.has(id);
            if (exists) {
              this.inMemoryStore.delete(id);
              return this.createMockResponse(204, null, url);
            } else {
              return this.createMockResponse(404, { error: `Contact with ID ${id} not found` }, url);
            }
          }
        }

        // 5. Match POST /api/v1/actions
        if (url.endsWith('/api/v1/actions') && method === 'POST') {
          const payload = options.data;
          const id = faker.string.uuid();
          const actionResponse: ActionResponse = {
            id,
            status: 'pending',
            priority: 'medium',
            ...payload,
          };
          this.inMemoryActions.set(id, actionResponse);
          return this.createMockResponse(201, actionResponse, url);
        }

        // 6. Match GET /api/v1/contacts/:contactId/actions
        const contactActionsMatch = url.match(/\/api\/v1\/contacts\/([^/]+)\/actions$/);
        if (contactActionsMatch && method === 'GET') {
          const contactId = contactActionsMatch[1];
          const actions = Array.from(this.inMemoryActions.values()).filter(
            (a) => String(a.contact_id) === String(contactId)
          );
          return this.createMockResponse(200, actions, url);
        }

        // 7. Match PATCH /api/v1/actions/:id/status
        const actionStatusMatch = url.match(/\/api\/v1\/actions\/([^/]+)\/status$/);
        if (actionStatusMatch && method === 'PATCH') {
          const id = actionStatusMatch[1];
          const payload = options.data;
          const existing = this.inMemoryActions.get(id);
          if (!existing) {
            return this.createMockResponse(404, { error: `Action with ID ${id} not found` }, url);
          }
          const updated: ActionResponse = {
            ...existing,
            status: payload?.status,
          };
          this.inMemoryActions.set(id, updated);
          return this.createMockResponse(200, updated, url);
        }

        // Fallback to real fetch if url is outside mock domain
        return originalFetch(urlOrRequest, options);
      };
    }
  }
}

export const mockAPIServer = new MockAPIServer();
