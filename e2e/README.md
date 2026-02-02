# E2E Tests - Nonprofit Manager

End-to-end tests using Playwright for comprehensive application testing.

## Setup

### Install Dependencies

```bash
cd e2e
npm install
```

### Install Playwright Browsers

```bash
npx playwright install
```

### Configure Environment

Copy `.env.test` and update values if needed:

```bash
cp .env.test .env.test.local
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:headed
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:ui
```

### Run Tests in Debug Mode

```bash
npm run test:debug
```

### Run Specific Test File

```bash
npx playwright test tests/auth.spec.ts
```

### Run Tests for Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Reports

After running tests, view the HTML report:

```bash
npm run test:report
```

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Feature Name', () => {
  test('should do something', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/feature');
    // Test assertions
  });
});
```

### Using Fixtures

#### Authenticated Page

```typescript
test('my test', async ({ authenticatedPage }) => {
  // Page is already logged in
  await authenticatedPage.goto('/dashboard');
});
```

#### Auth Token

```typescript
test('my test', async ({ authenticatedPage, authToken }) => {
  // Use token for API calls
  await createTestData(authenticatedPage, authToken);
});
```

#### Clean Database

```typescript
import { testWithCleanDB } from '../fixtures/auth.fixture';

testWithCleanDB('my test', async ({ authenticatedPage, authToken }) => {
  // Database is clean before and after test
});
```

### Helper Functions

#### Authentication

```typescript
import { login, logout, loginViaAPI } from '../helpers/auth';

// Login via UI
await login(page, email, password);

// Login via API (faster)
const { token } = await loginViaAPI(page, email, password);

// Logout
await logout(page);
```

#### Database

```typescript
import {
  createTestAccount,
  createTestContact,
  clearDatabase,
} from '../helpers/database';

// Create test data
const { id } = await createTestAccount(page, token, {
  name: 'Test Org',
});

// Clear database
await clearDatabase(page, token);
```

## Test Organization

### Directory Structure

```
e2e/
├── tests/                 # Test files
│   ├── auth.spec.ts      # Authentication tests
│   ├── accounts.spec.ts  # Accounts module tests
│   ├── contacts.spec.ts  # Contacts module tests
│   └── ...
├── fixtures/             # Test fixtures
│   └── auth.fixture.ts   # Authentication fixtures
├── helpers/              # Test helpers
│   ├── auth.ts           # Auth helper functions
│   └── database.ts       # Database helper functions
├── playwright.config.ts  # Playwright configuration
└── package.json
```

### Naming Conventions

- Test files: `*.spec.ts`
- Fixtures: `*.fixture.ts`
- Helpers: descriptive names (e.g., `auth.ts`, `database.ts`)

## Best Practices

### 1. Use Page Object Model (POM)

Create page objects for complex pages:

```typescript
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.page.fill('input[name="email"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('input[name="password"]', password);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
```

### 2. Use Data Test IDs

Add `data-testid` attributes to elements for stable selectors:

```tsx
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.click('[data-testid="submit-button"]');
```

### 3. Wait Appropriately

```typescript
// Wait for URL
await page.waitForURL('/dashboard');

// Wait for element
await page.waitForSelector('[data-testid="user-menu"]');

// Wait for network idle
await page.waitForLoadState('networkidle');
```

### 4. Clean Up After Tests

Always clean up test data to avoid interference:

```typescript
test.afterEach(async ({ authenticatedPage, authToken }) => {
  await clearDatabase(authenticatedPage, authToken);
});
```

### 5. Use Soft Assertions for Multiple Checks

```typescript
await expect.soft(page.locator('.name')).toContainText('John');
await expect.soft(page.locator('.email')).toContainText('john@example.com');
```

## Debugging Tests

### 1. Run in Headed Mode

```bash
npm run test:headed
```

### 2. Use Debug Mode

```bash
npm run test:debug
```

### 3. Use Playwright Inspector

```bash
npx playwright test --debug
```

### 4. Add Console Logs

```typescript
console.log('Current URL:', page.url());
console.log('Element text:', await element.textContent());
```

### 5. Take Screenshots

```typescript
await page.screenshot({ path: 'debug.png' });
```

### 6. Pause Execution

```typescript
await page.pause(); // Opens Playwright Inspector
```

## CI Integration

Tests are configured to run in CI with:

- Reduced parallelism (1 worker)
- 2 retries on failure
- Video recording on failure
- Screenshot on failure

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: |
    cd e2e
    npm ci
    npx playwright install --with-deps
    npm test
```

## Troubleshooting

### Tests Timing Out

- Increase timeout in `playwright.config.ts`
- Check if backend/frontend servers are running
- Use `--debug` mode to see what's happening

### Flaky Tests

- Add explicit waits for elements
- Use `waitForLoadState('networkidle')`
- Increase timeouts for slow operations
- Avoid `waitForTimeout` - use specific waits instead

### Database Issues

- Ensure test database is clean before tests
- Check database connection settings
- Verify migrations are up to date

### Authentication Issues

- Check test user credentials in `.env.test`
- Verify backend auth endpoints are working
- Clear browser storage before tests

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Retry](https://playwright.dev/docs/test-retries)
- [Debugging](https://playwright.dev/docs/debug)
