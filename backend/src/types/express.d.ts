import 'express-serve-static-core';
import type { AuthorizationRequestContext } from '@app-types/authorization';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId: string;
    user?: {
      id: string;
      email: string;
      role: string;
    };
    authorizationContext?: AuthorizationRequestContext;
  }
}
