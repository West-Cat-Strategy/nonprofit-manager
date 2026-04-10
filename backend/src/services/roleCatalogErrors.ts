export const ROLE_CATALOG_ERROR_CODES = [
  'NOT_FOUND',
  'CONFLICT',
  'RESERVED',
  'IN_USE',
  'UNKNOWN_PERMISSION',
  'INVALID_INPUT',
] as const;

export type RoleCatalogErrorCode = (typeof ROLE_CATALOG_ERROR_CODES)[number];

export class RoleCatalogError extends Error {
  public readonly code: RoleCatalogErrorCode;

  constructor(code: RoleCatalogErrorCode, message: string) {
    super(message);
    this.name = 'RoleCatalogError';
    this.code = code;
  }
}

export const isRoleCatalogError = (error: unknown): error is RoleCatalogError =>
  error instanceof RoleCatalogError;

