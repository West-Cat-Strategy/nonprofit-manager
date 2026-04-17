import type { AuthorizationRequestContext } from '@app-types/authorization';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      user?: {
        id: string;
        email: string;
        role: string;
        organizationId?: string;
        organization_id?: string;
      };
      organizationId?: string;
      accountId?: string;
      tenantId?: string;
      validatedQuery?: Record<string, unknown>;
      validatedParams?: Record<string, string>;
      authorizationContext?: AuthorizationRequestContext;
    }
  }
}

export {};
