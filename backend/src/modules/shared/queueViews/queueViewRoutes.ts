import type { Request, RequestHandler, Router } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  archiveQueueViewDefinition,
  listQueueViewDefinitions,
  upsertQueueViewDefinition,
  type ArchiveQueueViewDefinitionInput,
  type QueueViewSurface,
  type UpsertQueueViewDefinitionInput,
} from './queueViewDefinitionService';

interface QueueViewListRequest {
  surface: QueueViewSurface;
  ownerUserId?: string | null;
  permissionScopes?: string[];
}

interface RegisterQueueViewRoutesOptions {
  list: {
    path?: string;
    middleware?: unknown[];
    resolve: (req: Request) => QueueViewListRequest;
  };
  upsert: {
    path?: string;
    middleware?: unknown[];
    resolve: (req: Request) => UpsertQueueViewDefinitionInput;
    successStatus?: number;
  };
  archive: {
    path: string;
    middleware?: unknown[];
    resolve: (req: Request) => ArchiveQueueViewDefinitionInput;
  };
}

const defaultQueueViewsPath = '/queue-views';

const asRouteMiddleware = (middleware: unknown[] | undefined): RequestHandler[] =>
  (middleware ?? []) as RequestHandler[];

export const registerQueueViewRoutes = (
  router: Router,
  options: RegisterQueueViewRoutesOptions
): void => {
  const listQueueViews: RequestHandler = async (req, res, next) => {
    try {
      const args = options.list.resolve(req);
      const views = await listQueueViewDefinitions(
        args.surface,
        args.ownerUserId,
        args.permissionScopes ?? []
      );
      sendSuccess(res, views);
    } catch (error) {
      next(error);
    }
  };

  router.get(
    options.list.path ?? defaultQueueViewsPath,
    ...asRouteMiddleware(options.list.middleware),
    listQueueViews
  );

  const upsertQueueView: RequestHandler = async (req, res, next) => {
    try {
      const view = await upsertQueueViewDefinition(options.upsert.resolve(req));
      sendSuccess(res, view, options.upsert.successStatus ?? 201);
    } catch (error) {
      next(error);
    }
  };

  router.post(
    options.upsert.path ?? defaultQueueViewsPath,
    ...asRouteMiddleware(options.upsert.middleware),
    upsertQueueView
  );

  const archiveQueueView: RequestHandler = async (req, res, next) => {
    try {
      const view = await archiveQueueViewDefinition(options.archive.resolve(req));
      sendSuccess(res, view);
    } catch (error) {
      next(error);
    }
  };

  router.delete(
    options.archive.path,
    ...asRouteMiddleware(options.archive.middleware),
    archiveQueueView
  );
};
