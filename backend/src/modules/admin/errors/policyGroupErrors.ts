export const POLICY_GROUP_ERROR_CODES = [
  'NOT_FOUND',
  'CONFLICT',
  'RESERVED',
  'UNKNOWN_ROLE',
  'INVALID_INPUT',
] as const;

export type PolicyGroupErrorCode = (typeof POLICY_GROUP_ERROR_CODES)[number];

export class PolicyGroupError extends Error {
  public readonly code: PolicyGroupErrorCode;

  constructor(code: PolicyGroupErrorCode, message: string) {
    super(message);
    this.name = 'PolicyGroupError';
    this.code = code;
  }
}

export const isPolicyGroupError = (error: unknown): error is PolicyGroupError =>
  error instanceof PolicyGroupError;
