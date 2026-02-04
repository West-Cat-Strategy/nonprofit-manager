import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
export declare const getBranding: (_req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const putBranding: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=adminBrandingController.d.ts.map