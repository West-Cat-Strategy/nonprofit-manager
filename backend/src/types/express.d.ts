import 'express-serve-static-core';
import type { AuthorizationRequestContext } from '@app-types/authorization';
import type { ParsedQs } from 'qs';

declare module 'express-serve-static-core' {
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
    validatedQuery?: ParsedQs | Record<string, unknown>;
    validatedParams?: Record<string, string>;
    authorizationContext?: AuthorizationRequestContext;
  }
}
