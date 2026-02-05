/**
 * Centralized validation utilities
 */

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email) return null; // Empty is valid (optional field)
  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// Password validation
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_DIGIT_REGEX = /\d/;
const PASSWORD_SPECIAL_REGEX = /[@$!%*?&]/;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!PASSWORD_LOWERCASE_REGEX.test(password)) {
    return 'Password must contain a lowercase letter';
  }
  if (!PASSWORD_UPPERCASE_REGEX.test(password)) {
    return 'Password must contain an uppercase letter';
  }
  if (!PASSWORD_DIGIT_REGEX.test(password)) {
    return 'Password must contain a number';
  }
  if (!PASSWORD_SPECIAL_REGEX.test(password)) {
    return 'Password must contain a special character (@$!%*?&)';
  }
  return null;
}

export function isStrongPassword(password: string): boolean {
  return validatePassword(password) === null;
}

// Phone number validation (basic)
const PHONE_REGEX = /^[\d\s\-+()]{7,20}$/;

export function validatePhoneNumber(phone: string): string | null {
  if (!phone) return null; // Empty is valid (optional field)
  const cleaned = phone.trim();
  if (!PHONE_REGEX.test(cleaned)) {
    return 'Please enter a valid phone number';
  }
  return null;
}

// URL validation
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;

export function validateUrl(url: string): string | null {
  if (!url) return null; // Empty is valid (optional field)
  if (!URL_REGEX.test(url.trim())) {
    return 'Please enter a valid URL';
  }
  return null;
}

export function isValidUrl(url: string): boolean {
  return URL_REGEX.test(url.trim());
}

// Postal code validation
const POSTAL_CODE_PATTERNS: Record<string, { regex: RegExp; example: string }> = {
  'US': { regex: /^\d{5}(-\d{4})?$/, example: '12345 or 12345-6789' },
  'USA': { regex: /^\d{5}(-\d{4})?$/, example: '12345 or 12345-6789' },
  'United States': { regex: /^\d{5}(-\d{4})?$/, example: '12345 or 12345-6789' },
  'CA': { regex: /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/, example: 'A1A 1A1' },
  'Canada': { regex: /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/, example: 'A1A 1A1' },
  'UK': { regex: /^[A-Za-z]{1,2}\d[A-Za-z\d]?[ ]?\d[A-Za-z]{2}$/, example: 'SW1A 1AA' },
  'United Kingdom': { regex: /^[A-Za-z]{1,2}\d[A-Za-z\d]?[ ]?\d[A-Za-z]{2}$/, example: 'SW1A 1AA' },
  'GB': { regex: /^[A-Za-z]{1,2}\d[A-Za-z\d]?[ ]?\d[A-Za-z]{2}$/, example: 'SW1A 1AA' },
  'DE': { regex: /^\d{5}$/, example: '12345' },
  'Germany': { regex: /^\d{5}$/, example: '12345' },
};

const GENERIC_POSTAL_PATTERN = /^[\w\s-]{3,10}$/;

export function validatePostalCode(postalCode: string, country?: string | null): string | null {
  if (!postalCode) return null; // Empty is valid (optional field)

  const normalizedCountry = country?.trim() || '';
  const pattern = POSTAL_CODE_PATTERNS[normalizedCountry];

  if (pattern) {
    if (!pattern.regex.test(postalCode.trim())) {
      return `Invalid postal code format for ${normalizedCountry}. Example: ${pattern.example}`;
    }
    return null;
  }

  // Generic validation for other countries
  if (!GENERIC_POSTAL_PATTERN.test(postalCode.trim())) {
    return 'Postal code must be 3-10 characters (letters, numbers, spaces, or dashes)';
  }

  return null;
}

// Required field validation
export function validateRequired(value: string | null | undefined, fieldName: string): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

// Min/max length validation
export function validateLength(
  value: string,
  fieldName: string,
  options: { min?: number; max?: number }
): string | null {
  const { min, max } = options;
  const length = value.trim().length;

  if (min !== undefined && length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  if (max !== undefined && length > max) {
    return `${fieldName} must be no more than ${max} characters`;
  }
  return null;
}

// Numeric validation
export function validateNumeric(value: string, fieldName: string): string | null {
  if (!value) return null;
  if (isNaN(Number(value))) {
    return `${fieldName} must be a number`;
  }
  return null;
}

// Date validation
export function validateDate(value: string, fieldName: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return `${fieldName} must be a valid date`;
  }
  return null;
}

// Future date validation
export function validateFutureDate(value: string, fieldName: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return `${fieldName} must be a valid date`;
  }
  if (date <= new Date()) {
    return `${fieldName} must be in the future`;
  }
  return null;
}
