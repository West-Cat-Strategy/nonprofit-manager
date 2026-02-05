/**
 * Custom hook for form state management
 * Consolidates common form patterns: state, errors, validation, submission
 */

import { useState, useCallback, type ChangeEvent } from 'react';

export type FormErrors<T> = Partial<Record<keyof T | 'submit', string>>;

export type ValidationRules<T> = {
  [K in keyof T]?: (value: T[K], formData: T) => string | null;
};

export interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
  onSubmit?: (data: T) => Promise<void>;
}

export interface UseFormReturn<T> {
  /** Current form values */
  values: T;
  /** Validation errors by field name */
  errors: FormErrors<T>;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Whether form has been modified */
  isDirty: boolean;
  /** Update a single field value */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Update multiple field values */
  setValues: (updates: Partial<T>) => void;
  /** Set a specific error */
  setError: (field: keyof T | 'submit', message: string) => void;
  /** Clear a specific error */
  clearError: (field: keyof T | 'submit') => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Handle input change event (auto-clears field error) */
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  /** Validate all fields and return whether valid */
  validate: () => boolean;
  /** Validate a single field */
  validateField: (field: keyof T) => boolean;
  /** Handle form submission with validation */
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  /** Reset form to initial values */
  reset: () => void;
  /** Reset form to specific values */
  resetTo: (values: T) => void;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validationRules = {} as ValidationRules<T>,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // Auto-clear error for this field
    setErrors((prev) => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const setValues = useCallback((updates: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
    // Clear errors for updated fields
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(updates).forEach((key) => {
        delete newErrors[key as keyof T];
      });
      return newErrors;
    });
  }, []);

  const setError = useCallback((field: keyof T | 'submit', message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearError = useCallback((field: keyof T | 'submit') => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const fieldValue =
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      setValue(name as keyof T, fieldValue as T[keyof T]);
    },
    [setValue]
  );

  const validateField = useCallback(
    (field: keyof T): boolean => {
      const rule = validationRules[field];
      if (!rule) return true;

      const error = rule(values[field], values);
      if (error) {
        setError(field, error);
        return false;
      }
      clearError(field);
      return true;
    },
    [values, validationRules, setError, clearError]
  );

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors<T> = {};
    let isValid = true;

    // Run all validation rules
    (Object.keys(validationRules) as Array<keyof T>).forEach((field) => {
      const rule = validationRules[field];
      if (rule) {
        const error = rule(values[field], values);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      if (!onSubmit) {
        return;
      }

      setIsSubmitting(true);
      clearError('submit');

      try {
        await onSubmit(values);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'An error occurred. Please try again.';
        setError('submit', message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, onSubmit, values, setError, clearError]
  );

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setIsDirty(false);
  }, [initialValues]);

  const resetTo = useCallback((newValues: T) => {
    setValuesState(newValues);
    setErrors({});
    setIsDirty(false);
  }, []);

  return {
    values,
    errors,
    isSubmitting,
    isDirty,
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    handleChange,
    validate,
    validateField,
    handleSubmit,
    reset,
    resetTo,
  };
}

/**
 * Common validation rules factory functions
 */
export const formValidators = {
  required:
    (fieldName: string) =>
    (value: unknown): string | null => {
      if (value === null || value === undefined || value === '') {
        return `${fieldName} is required`;
      }
      if (typeof value === 'string' && !value.trim()) {
        return `${fieldName} is required`;
      }
      return null;
    },

  email:
    () =>
    (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value !== 'string') return 'Invalid email';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
      return null;
    },

  minLength:
    (min: number, fieldName: string) =>
    (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value !== 'string') return null;
      if (value.length < min) {
        return `${fieldName} must be at least ${min} characters`;
      }
      return null;
    },

  maxLength:
    (max: number, fieldName: string) =>
    (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value !== 'string') return null;
      if (value.length > max) {
        return `${fieldName} must be no more than ${max} characters`;
      }
      return null;
    },

  pattern:
    (regex: RegExp, message: string) =>
    (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value !== 'string') return null;
      if (!regex.test(value)) {
        return message;
      }
      return null;
    },

  /**
   * Combine multiple validators - returns first error found
   */
  compose:
    (...validators: Array<(value: unknown) => string | null>) =>
    (value: unknown): string | null => {
      for (const validator of validators) {
        const error = validator(value);
        if (error) return error;
      }
      return null;
    },
};

export default useForm;
