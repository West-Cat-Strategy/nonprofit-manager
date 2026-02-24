type AnyRecord = Record<string, unknown>;

const isObject = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null;

const unwrapEnvelopePayload = (body: unknown): unknown => {
  if (
    isObject(body) &&
    body.success === true &&
    Object.prototype.hasOwnProperty.call(body, 'data')
  ) {
    return body.data;
  }
  return body;
};

export function unwrapSuccess<T>(body: unknown): T {
  return unwrapEnvelopePayload(body) as T;
}

const findList = (candidate: unknown): unknown[] | null => {
  if (Array.isArray(candidate)) {
    return candidate;
  }

  if (!isObject(candidate)) {
    return null;
  }

  if (Array.isArray(candidate.data)) {
    return candidate.data;
  }

  if (Array.isArray(candidate.items)) {
    return candidate.items;
  }

  if (isObject(candidate.data) && Array.isArray(candidate.data.data)) {
    return candidate.data.data;
  }

  return null;
};

export function unwrapList<T>(body: unknown): T[] {
  const payload = unwrapEnvelopePayload(body);
  const list = findList(payload) ?? findList(body);
  if (!list) {
    throw new Error(`Unable to unwrap list payload: ${JSON.stringify(body)}`);
  }
  return list as T[];
}
