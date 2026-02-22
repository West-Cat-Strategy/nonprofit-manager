# Component Testing Guide

**Last Updated**: 2026-02-18

How to test React components in nonprofit-manager using React Testing Library and Vitest.

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Testing Patterns](#testing-patterns)
- [User Interaction Testing](#3-testing-user-interactions)
- [Testing with Async Data](#testing-with-async-data)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Component testing** verifies that React components render correctly and respond to user interaction.

Different from:
- **Unit tests** — Test individual functions in isolation
- **Integration tests** — Test multiple components working together
- **E2E tests** — Test entire application in browser

Component tests:
- Render the component
- Simulate user interactions (click, type, etc.)
- Verify output changed correctly

### Tools Used

- **Vitest** — Fast unit test runner (Jest-compatible)
- **React Testing Library** — Query and interact with components
- **@testing-library/user-event** — Simulate realistic user interactions

---

## Getting Started

### File Location

Test files live next to the component:

```
frontend/src/
  components/
    Button.tsx                 ← Component
    Button.test.tsx            ← Test file (same directory)
    Button.module.css
  pages/
    Dashboard.tsx
    Dashboard.test.tsx
    Dashboard.module.css
```

### File Naming

- `ComponentName.test.tsx` (Vitest convention)
- `ComponentName.spec.tsx` (also works)

### Running Tests

```bash
cd frontend

# Run all component tests
npm test

# Run tests in watch mode (re-run on file changes)
npm test -- --watch

# Run tests for specific file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"

# Check coverage
npm run test:coverage
```

### Basic Test Template

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

---

## Testing Patterns

### 1. Rendering Components

```typescript
import { render } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  it('should render user information', () => {
    // Render component
    render(<UserCard user={{ id: '1', name: 'John', email: 'john@example.com' }} />);

    // Component is now in the DOM, can query it
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should render with default props', () => {
    render(<UserCard user={defaultUser} />);
    
    expect(screen.getByText(defaultUser.name)).toBeInTheDocument();
  });
});
```

### 2. Querying Elements

Use `screen` object to find elements (instead of `container.querySelector`):

```typescript
describe('Button queries', () => {
  it('should find button by text', () => {
    render(<button>Submit</button>);
    
    // Find by exact text (recommended)
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('should find button by role', () => {
    render(<button>Submit</button>);
    
    // Find by button role (semantic HTML)
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toBeInTheDocument();
  });

  it('should find input by label', () => {
    render(
      <label htmlFor="email">Email</label>
      <input id="email" type="email" />
    );

    // Find input by associated label
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should find by role (most semantic)', () => {
    render(<input type="checkbox" aria-label="Accept terms" />);

    // By role is most semantic and accessible
    const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' });
    expect(checkbox).not.toBeChecked();
  });

  it('should find by data-testid (when needed)', () => {
    render(<div data-testid="custom-element">Content</div>);

    // Use data-testid as last resort when role/text won't work
    const element = screen.getByTestId('custom-element');
    expect(element).toHaveTextContent('Content');
  });
});
```

**Query Priority** (use in this order):
1. `getByRole` — Most semantic, tests like a user would
2. `getByLabelText` — How form inputs would be used
3. `getByText` — For buttons and other text content
4. `getByTestId` — When nothing else works

### 3. Testing User Interactions

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Form interactions', () => {
  it('should handle button click', async () => {
    const mockClick = vi.fn();
    render(<button onClick={mockClick}>Submit</button>);

    const button = screen.getByRole('button');
    
    // await is important for user-event
    await userEvent.click(button);

    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('should type into text input', async () => {
    const MockedForm = () => {
      const [value, setValue] = React.useState('');
      return (
        <>
          <input 
            type="text" 
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div>{value}</div>
        </>
      );
    };

    render(<MockedForm />);

    const input = screen.getByRole('textbox');
    
    // Type into input (like a real user would)
    await userEvent.type(input, 'Hello');

    // Text appears in the div
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle checkbox toggle', async () => {
    const MockedCheckbox = () => {
      const [checked, setChecked] = React.useState(false);
      return (
        <label>
          <input 
            type="checkbox" 
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          Accept terms
        </label>
      );
    };

    render(<MockedCheckbox />);

    const checkbox = screen.getByRole('checkbox');
    
    expect(checkbox).not.toBeChecked();
    
    // Click checkbox to toggle
    await userEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it('should handle form submission', async () => {
    const mockSubmit = vi.fn();

    render(
      <form onSubmit={mockSubmit}>
        <input type="email" />
        <button>Submit</button>
      </form>
    );

    const button = screen.getByRole('button');
    
    await userEvent.click(button);

    expect(mockSubmit).toHaveBeenCalledOnce();
  });

  it('should handle selecting from dropdown', async () => {
    render(
      <select aria-label="Role">
        <option>Admin</option>
        <option>User</option>
        <option>Guest</option>
      </select>
    );

    const select = screen.getByRole('combobox', { name: 'Role' });

    // Select option by text
    await userEvent.selectOptions(select, 'User');

    expect(select).toHaveValue('User');
  });
});
```

### 4. Testing Conditional Rendering

```typescript
describe('conditional rendering', () => {
  it('should show loading state', () => {
    render(<UserList loading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('John')).not.toBeInTheDocument(); // User not shown
  });

  it('should show error message', () => {
    render(<UserList error="Network failed" />);

    expect(screen.getByText('Error: Network failed')).toBeInTheDocument();
  });

  it('should show content when loaded', () => {
    const users = [{ id: '1', name: 'John' }];
    render(<UserList users={users} />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
```

---

## Testing with Async Data

### Waiting for async updates

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('async data', () => {
  it('should fetch and display user data', async () => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ name: 'John', email: 'john@example.com' }),
      })
    );

    render(<UserProfile userId="123" />);

    // Data not shown immediately
    expect(screen.queryByText('John')).not.toBeInTheDocument();

    // Wait for async data to load
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

    render(<UserProfile userId="123" />);

    // Loading state shows
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle fetch errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    );

    render(<UserProfile userId="123" />);

    // Error message appears
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Components with Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useFormData } from './useFormData';

describe('useFormData hook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFormData({ email: '', password: '' }));

    expect(result.current.formData).toEqual({ email: '', password: '' });
  });

  it('should update form data', () => {
    const { result } = renderHook(() => useFormData({ email: '', password: '' }));

    // Wrap state updates in act()
    act(() => {
      result.current.setValue('email', 'john@example.com');
    });

    expect(result.current.formData.email).toBe('john@example.com');
  });

  it('should validate form data', () => {
    const { result } = renderHook(() => useFormData({ email: '' }));

    act(() => {
      result.current.setValue('email', 'invalid-email');
    });

    expect(result.current.errors.email).toBeDefined();
  });
});
```

---

## Common Patterns

### Testing Button Components

```typescript
describe('Button component', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const mockClick = vi.fn();
    render(<Button onClick={mockClick}>Submit</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', async () => {
    const mockClick = vi.fn();
    render(<Button disabled onClick={mockClick}>Submit</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    await userEvent.click(button);

    expect(mockClick).not.toHaveBeenCalled();
  });

  it('should apply variant styles', () => {
    render(<Button variant="primary">Primary</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');
  });
});
```

### Testing Form Components

```typescript
describe('LoginForm', () => {
  it('should validate required fields', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    // Click submit without filling form
    await userEvent.click(submitButton);

    // Validation errors show
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.click(submitButton);

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const mockSubmit = vi.fn();
    render(<LoginForm onSubmit={mockSubmit} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(submitButton);

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
  });
});
```

### Testing Modal Components

```typescript
describe('Modal', () => {
  it('should show modal when open prop is true', () => {
    render(<Modal open={true} title="Confirm">Delete item?</Modal>);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
  });

  it('should hide modal when open prop is false', () => {
    render(<Modal open={false}>Delete item?</Modal>);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onClose when dismiss button clicked', async () => {
    const mockClose = vi.fn();
    render(<Modal open={true} onClose={mockClose}>Content</Modal>);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    await userEvent.click(closeButton);

    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('should call onConfirm when confirm button clicked', async () => {
    const mockConfirm = vi.fn();
    render(
      <Modal open={true} onConfirm={mockConfirm}>
        Delete?
      </Modal>
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    await userEvent.click(confirmButton);

    expect(mockConfirm).toHaveBeenCalledOnce();
  });
});
```

---

## Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ❌ BAD - Tests implementation (props)
it('should accept disabled prop', () => {
  const { rerender } = render(<Button disabled={false}>Click</Button>);
  expect(screen.getByRole('button')).not.toBeDisabled();

  rerender(<Button disabled={true}>Click</Button>);
  expect(screen.getByRole('button')).toBeDisabled();
});

// ✅ GOOD - Tests user behavior
it('should be disabled when disabled', () => {
  render(<Button disabled>Click</Button>);
  
  const button = screen.getByRole('button');
  expect(button).toBeDisabled();
  
  // User can't click disabled button
  await userEvent.click(button);
  // No interaction occurs
});
```

### 2. Use Semantic Queries

```typescript
// ❌ BAD - Brittle, tests implementation
it('should render form', () => {
  const { container } = render(<Form />);
  expect(container.querySelector('.form-wrapper')).toBeInTheDocument();
});

// ✅ GOOD - Tests accessibility
it('should render form', () => {
  render(<Form />);
  
  // Query by what the user sees/interacts with
  expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
});
```

### 3. Test Complete User Flows

```typescript
// ❌ BAD - Tests individual lines
it('should render inputs', () => {
  render(<LoginForm />);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});

it('should render button', () => {
  render(<LoginForm />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});

// ✅ GOOD - Tests complete user interaction
it('should allow user to login', async () => {
  const mockSubmit = vi.fn();
  render(<LoginForm onSubmit={mockSubmit} />);

  // User flow: fill form, submit
  await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'password');
  await userEvent.click(screen.getByRole('button', { name: 'Login' }));

  expect(mockSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'password',
  });
});
```

### 4. Mock External Dependencies

```typescript
// ❌ BAD - Makes real API call
it('should fetch user', async () => {
  render(<UserProfile userId="123" />);
  
  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument();
  });
  // Test is slow and fragile
});

// ✅ GOOD - Mocks API
it('should fetch user', async () => {
  vi.mock('../api', () => ({
    getUser: vi.fn(() => Promise.resolve({ name: 'John' })),
  }));

  render(<UserProfile userId="123" />);

  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument();
  });
  // Test is fast and reliable
});
```

### 5. Describe by Feature, Not Implementation

```typescript
// ❌ BAD - Organized by implementation
describe('UserProfile', () => {
  it('renders', () => { /* ... */ });
  it('fetches', () => { /* ... */ });
  it('updates', () => { /* ... */ });
});

// ✅ GOOD - Organized by user features
describe('UserProfile', () => {
  describe('initial load', () => {
    it('should show loading state while fetching', () => { /* ... */ });
    it('should display user data when loaded', () => { /* ... */ });
    it('should show error if fetch fails', () => { /* ... */ });
  });

  describe('user interactions', () => {
    it('should edit profile when edit button clicked', () => { /* ... */ });
    it('should save changes when save button clicked', () => { /* ... */ });
  });
});
```

---

## Troubleshooting

### "screen.getByText not finding element"

Element might not be in DOM or text might be different:

```typescript
// Debug: print rendered output
render(<Component />);
screen.debug(); // Shows HTML

// Or check what text is actually there
const element = screen.queryByText('Expected text');
if (!element) {
  console.log('Available text:', screen.getByText(/text/).textContent);
}
```

### "act() warning"

State update happening outside of act():

```typescript
// ❌ WRONG
it('should update state', () => {
  const { result } = renderHook(() => useState(0));
  
  result.current[1](1); // ← act() warning
  expect(result.current[0]).toBe(1);
});

// ✅ CORRECT
it('should update state', () => {
  const { result } = renderHook(() => useState(0));
  
  act(() => {
    result.current[1](1);
  });
  
  expect(result.current[0]).toBe(1);
});
```

### "timeout waiting for element"

Element not appearing in time:

```typescript
// Increase timeout
await waitFor(
  () => {
    expect(screen.getByText('Data')).toBeInTheDocument();
  },
  { timeout: 5000 } // 5 seconds
);

// Or check if it ever appears
const element = await screen.findByText('Data'); // Waits by default
```

### "useContext requires Provider"

Component needs context provider:

```typescript
// ❌ Fails - context not provided
render(<Component />);

// ✅ Wrap with provider
render(
  <UserContext.Provider value={mockUser}>
    <Component />
  </UserContext.Provider>
);

// Or create test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <UserContext.Provider value={mockUser}>
    {children}
  </UserContext.Provider>
);

render(<Component />, { wrapper: TestWrapper });
```

---

## See Also

- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — Unit testing utility functions
- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — Testing overview
- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — Code standards
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/) — Official docs
