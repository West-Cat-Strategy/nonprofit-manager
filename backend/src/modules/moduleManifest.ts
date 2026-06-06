import type { Router } from 'express';
import type { WorkspaceModuleKey } from '@app-types/workspaceModules';

export type ModuleDomainFamily =
  | 'case-management'
  | 'communications-integrations'
  | 'constituent-records'
  | 'engagement'
  | 'fundraising-finance'
  | 'identity-access'
  | 'ingest-imports'
  | 'organization-admin'
  | 'platform'
  | 'portal-experience'
  | 'publishing-public-runtime'
  | 'reporting-analytics';

export interface ModuleRouteDeclaration {
  readonly mountPath: `/${string}`;
  readonly router: Router;
}

export interface ModuleSchedulerDeclaration {
  readonly id: string;
  readonly description?: string;
}

export interface ModuleProviderDeclaration {
  readonly id: string;
  readonly description?: string;
}

export interface BackendModuleDeclaration {
  readonly id: string;
  readonly domainFamily: ModuleDomainFamily;
  readonly routes: readonly ModuleRouteDeclaration[];
  readonly publicRoutes: readonly ModuleRouteDeclaration[];
  readonly workspaceKey?: WorkspaceModuleKey;
  readonly schedulers: readonly ModuleSchedulerDeclaration[];
  readonly providers: readonly ModuleProviderDeclaration[];
}

export interface BackendModuleDeclarationInput {
  readonly id: string;
  readonly domainFamily: ModuleDomainFamily;
  readonly routes?: readonly ModuleRouteDeclaration[];
  readonly publicRoutes?: readonly ModuleRouteDeclaration[];
  readonly workspaceKey?: WorkspaceModuleKey;
  readonly schedulers?: readonly ModuleSchedulerDeclaration[];
  readonly providers?: readonly ModuleProviderDeclaration[];
}

const freezeDeclarationList = <T extends object>(items: readonly T[] = []): readonly T[] =>
  Object.freeze(items.map((item) => Object.freeze({ ...item }) as T));

export const defineBackendModule = (
  declaration: BackendModuleDeclarationInput
): BackendModuleDeclaration =>
  Object.freeze({
    id: declaration.id,
    domainFamily: declaration.domainFamily,
    workspaceKey: declaration.workspaceKey,
    routes: freezeDeclarationList(declaration.routes),
    publicRoutes: freezeDeclarationList(declaration.publicRoutes),
    schedulers: freezeDeclarationList(declaration.schedulers),
    providers: freezeDeclarationList(declaration.providers),
  });
