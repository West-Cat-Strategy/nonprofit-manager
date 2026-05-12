export const withApplyContext = async <T>(
  label: string,
  sourceContactId: string,
  targetContactId: string,
  action: () => Promise<T>
): Promise<T> => {
  try {
    return await action();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw Object.assign(new Error(`${label} failed for source ${sourceContactId} -> target ${targetContactId}: ${detail}`), {
      cause: error,
    });
  }
};
