const INVALID_FIELD_SELECTOR = [
  'input[aria-invalid="true"]',
  'select[aria-invalid="true"]',
  'textarea[aria-invalid="true"]',
  'input:invalid',
  'select:invalid',
  'textarea:invalid',
].join(', ');

export const focusElement = (element: HTMLElement | null | undefined): boolean => {
  if (!element) {
    return false;
  }

  element.focus();
  return true;
};

export const focusFirstInvalidField = (container: ParentNode | null | undefined): boolean => {
  const field = container?.querySelector<HTMLElement>(INVALID_FIELD_SELECTOR);
  return focusElement(field);
};
