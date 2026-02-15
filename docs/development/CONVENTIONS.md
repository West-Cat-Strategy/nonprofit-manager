# Development Conventions

## File Naming

### Backend
- **Controllers**: `entityNameController.ts` (e.g., `volunteerController.ts`)
- **Services**: `entityNameService.ts` (e.g., `volunteerService.ts`)
- **Routes**: `entityName.ts` (e.g., `volunteer.ts`)
- **Middleware**: `descriptiveName.ts` (e.g., `auth.ts`, `errorHandler.ts`)
- **Types**: `entityName.ts` (e.g., `user.ts`, `volunteer.ts`)
- **Utils**: `descriptiveName.ts` (e.g., `validators.ts`, `helpers.ts`)

### Frontend
- **Pages**: `PascalCase.tsx` (e.g., `VolunteerList.tsx`, `Dashboard.tsx`)
- **Components**: `PascalCase.tsx` (e.g., `Button.tsx`, `Modal.tsx`)
- **Services**: `entityNameService.ts` (e.g., `volunteerService.ts`)
- **Redux Slices**: `entityNameSlice.ts` (e.g., `volunteerSlice.ts`)
- **Hooks**: `useDescriptiveName.ts` (e.g., `useAuth.ts`, `useVolunteers.ts`)
- **Utils**: `descriptiveName.ts` (e.g., `formatters.ts`, `validators.ts`)

### Database
- **Migrations**: `NNN_descriptive_name.sql` (e.g., `001_initial_schema.sql`)
- **Seeds**: `NNN_descriptive_name.sql` (e.g., `001_default_users.sql`)

## Code Comments

### When to Comment
- Complex business logic that isn't immediately obvious
- Workarounds for known issues
- Public API functions (use JSDoc)
- Non-obvious performance optimizations
- Regulatory or compliance requirements

### When NOT to Comment
- Obvious code (let the code speak for itself)
- Commented-out code (delete it - use git history)
- Redundant comments that repeat what code does

### JSDoc Format
```typescript
/**
 * Retrieves a volunteer by ID with their assignments
 * @param id - The UUID of the volunteer
 * @returns Promise resolving to volunteer with assignments, or null if not found
 * @throws {NotFoundError} If volunteer doesn't exist
 */
async function getVolunteerById(id: string): Promise<VolunteerWithAssignments | null> {
  // Implementation
}
```

## Environment Variables

### Required Variables

#### Backend (.env)
```bash
# Server
PORT=3000
NODE_ENV=development|production|test

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nonprofit_manager
DB_USER=postgres
DB_PASSWORD=

# Authentication
JWT_SECRET=
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:5173

# Optional
LOG_LEVEL=info|debug|warn|error
```

#### Frontend (.env)
```bash
# API
VITE_API_URL=http://localhost:3000/api
```

### Environment Variable Naming
- Prefix frontend vars with `VITE_`
- Use UPPER_SNAKE_CASE
- Group related vars together
- Document purpose in .env.example

### Optional Integrations
Some integrations can be disabled via environment variables:

- **Stripe**: Set `STRIPE_ENABLED=false` to disable payment processing features. The UI will hide payment-related components.
- **Plausible Analytics**: Analytics tracking is optional and self-hosted. See [deployment/PLAUSIBLE_SETUP.md](../deployment/PLAUSIBLE_SETUP.md).

## API Versioning

Current version: **v1** (not yet implemented in routes)

Future: When breaking changes needed, create `/api/v2/` routes

## Error Codes

### Backend Error Codes
```typescript
// Authentication & Authorization
AUTH_001: 'Invalid credentials'
AUTH_002: 'Token expired'
AUTH_003: 'Insufficient permissions'
AUTH_004: 'Account locked'

// Validation
VAL_001: 'Invalid input format'
VAL_002: 'Required field missing'
VAL_003: 'Value out of range'

// Database
DB_001: 'Record not found'
DB_002: 'Duplicate entry'
DB_003: 'Foreign key constraint violation'
DB_004: 'Database connection error'

// Business Logic
BIZ_001: 'Event capacity exceeded'
BIZ_002: 'Volunteer already assigned'
BIZ_003: 'Donation amount below minimum'
```

## Database Conventions

### Table Names
- Plural, snake_case: `users`, `event_registrations`
- Follow CDM naming where applicable

### Column Names
- snake_case: `first_name`, `created_at`
- Boolean fields: prefix with `is_` or `has_`
- Foreign keys: `{entity}_id` (e.g., `user_id`, `account_id`)

### Standard Audit Fields
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
created_by UUID REFERENCES users(id),
modified_by UUID REFERENCES users(id),
is_active BOOLEAN DEFAULT true
```

### Index Naming
```sql
idx_{table}_{column(s)} -- Regular index
uk_{table}_{column(s)}  -- Unique constraint
fk_{table}_{ref_table}  -- Foreign key
```

## Redux State Shape

```typescript
{
  auth: {
    user: User | null,
    token: string | null,
    isAuthenticated: boolean,
    loading: boolean
  },
  volunteers: {
    list: Volunteer[],
    current: Volunteer | null,
    loading: boolean,
    error: string | null
  },
  // ... other slices
}
```

## Component Structure (Frontend)

### Functional Component Template
```typescript
import { FC } from 'react';

interface ComponentNameProps {
  prop1: string;
  prop2?: number;
}

const ComponentName: FC<ComponentNameProps> = ({ prop1, prop2 = 0 }) => {
  // Hooks at the top
  const [state, setState] = useState();
  
  // Event handlers
  const handleAction = () => {
    // Implementation
  };
  
  // Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

## Testing Conventions

### Test File Naming
- Place test files next to source: `file.ts` → `file.test.ts`
- Or in `__tests__` directory

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('functionName', () => {
    it('should do expected behavior when condition', () => {
      // Arrange
      const input = setupInput();
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    it('should throw error when invalid input', () => {
      expect(() => functionName(invalid)).toThrow();
    });
  });
});
```

## Import Order

```typescript
// 1. External dependencies
import { FC } from 'react';
import { useDispatch } from 'react-redux';

// 2. Internal absolute imports
import { User } from '@/types/user';
import { formatDate } from '@/utils/formatters';

// 3. Relative imports
import { Button } from '../components/Button';
import styles from './Component.module.css';

// 4. Type-only imports at the end
import type { ComponentProps } from './types';
```

## CSS/Tailwind Conventions

### Class Order (Tailwind)
1. Layout: `flex`, `grid`, `block`
2. Positioning: `relative`, `absolute`
3. Sizing: `w-full`, `h-screen`
4. Spacing: `p-4`, `m-2`
5. Typography: `text-lg`, `font-bold`
6. Visual: `bg-blue-500`, `border`
7. Effects: `shadow`, `hover:`
8. State: `focus:`, `disabled:`

### Component-Specific Styles
Use Tailwind utility classes. For complex/reusable styles, create components.

## Performance Guidelines

### Backend
- Use database indexes for frequently queried fields
- Implement pagination for list endpoints (default 20 items)
- Use connection pooling (already configured)
- Cache static data where appropriate
- Avoid N+1 queries

### Frontend
- Lazy load routes with React.lazy()
- Memoize expensive computations with useMemo
- Optimize re-renders with React.memo and useCallback
- Debounce search inputs
- Use virtual scrolling for long lists

## Security Checklist

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React handles this mostly)
- [ ] CSRF protection (not needed for API-only backend with JWT)
- [ ] Rate limiting on auth endpoints
- [ ] Password strength requirements (min 8 chars, enforced)
- [ ] Secure password storage (bcrypt with salt rounds ≥ 10)
- [ ] HTTPS in production
- [ ] Environment variables for secrets
- [ ] Audit logging for sensitive operations
- [ ] Session timeout (JWT expiration)
- [ ] CORS properly configured

## Accessibility Guidelines

- Use semantic HTML elements
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Provide alt text for images
- Use proper heading hierarchy
- Make forms accessible with labels
- Test with screen readers

## Documentation Requirements

### Code Documentation
- JSDoc for all public functions/methods
- README.md in each major directory
- Inline comments for complex logic
- Type definitions serve as documentation

### API Documentation
- Document all endpoints (future: Swagger/OpenAPI)
- Include request/response examples
- Document error responses
- Note authentication requirements

### User Documentation
- Setup instructions (README.md)
- Deployment guide (future)
- Admin guide (future)
- User manual (future)
