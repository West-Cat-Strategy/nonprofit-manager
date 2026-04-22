import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  createContact,
  updateContact,
  fetchContactRelationships,
  createContactRelationship,
  deleteContactRelationship,
  fetchContacts,
  fetchContactTags,
} from '../../state';
import type { ContactRole, CreateContactRelationshipDTO, RelationshipType } from '../../../../types/contact';
import { useToast } from '../../../../contexts/useToast';
import { validatePostalCode } from '../../../../utils/validation';
import { toDateInputValue } from '../../../../utils/format';
import { formatApiErrorMessage } from '../../../../utils/apiError';
import type { ContactFormValues, ContactRecord } from './types';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import useConfirmDialog, { confirmPresets } from '../../../../hooks/useConfirmDialog';
import { contactsApiClient } from '../../api/contactsApiClient';
import { buildContactMutationPayload } from './contactMutationPayload';

interface UseContactFormProps {
  contact?: ContactRecord;
  mode: 'create' | 'edit';
  onCreated?: (contact: ContactRecord) => void;
  onCancel?: () => void;
}

const isMaskedPhn = (value: string): boolean => /^\*{2,}\d{4}$/.test(value.trim());
const STAFF_ACCOUNT_ROLE_NAMES = new Set(['Staff', 'Executive Director']);
const ERROR_FOCUS_PRIORITY = ['first_name', 'last_name', 'email', 'phone', 'mobile_phone', 'phn', 'postal_code'];

const normalizePhoneForComparison = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

const scrollAndFocusElement = (element: HTMLElement) => {
  element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
};

export function useContactForm({ contact, mode, onCreated, onCancel }: UseContactFormProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel: handleConfirmCancel } = useConfirmDialog();
  const getErrorMessage = (error: unknown, fallback: string) =>
    typeof error === 'string' ? error : formatApiErrorMessage(error, fallback);
  const { relationships, relationshipsLoading } = useAppSelector((state) => state.contacts.relationships);
  const { contacts, availableTags } = useAppSelector((state) => state.contacts.list);
  const [availableRoles, setAvailableRoles] = useState<ContactRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Pre-fill from URL params when creating (e.g., from relationship "Create New Person")
  const urlFirstName = searchParams.get('first_name') || '';
  const urlLastName = searchParams.get('last_name') || '';
  const urlAccountId = searchParams.get('account_id') || '';
  const returnToContactId = searchParams.get('return_to');

  const [formData, setFormData] = useState<ContactFormValues>({
    first_name: mode === 'create' ? urlFirstName : '',
    account_id: mode === 'create' ? urlAccountId : '',
    preferred_name: '',
    last_name: mode === 'create' ? urlLastName : '',
    middle_name: '',
    salutation: '',
    birth_date: '',
    gender: '',
    pronouns: '',
    phn: '',
    email: '',
    phone: '',
    mobile_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    no_fixed_address: false,
    preferred_contact_method: 'email',
    do_not_email: false,
    do_not_phone: false,
    do_not_text: false,
    do_not_voicemail: false,
    notes: '',
    tags: [],
    is_active: true,
    roles: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const hydratedContactIdRef = useRef<string | null>(null);

  const clearErrors = (...fieldNames: string[]) => {
    if (fieldNames.length === 0) {
      return;
    }

    setErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const fieldName of fieldNames) {
        if (fieldName in next) {
          delete next[fieldName];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const focusFieldInForm = (form: HTMLFormElement, fieldName: string) => {
    const target =
      form.querySelector<HTMLElement>(`[name="${fieldName}"]`) ??
      form.querySelector<HTMLElement>(`#${fieldName}`);

    if (target) {
      scrollAndFocusElement(target);
    }
  };

  const focusSubmitErrorBanner = (form: HTMLFormElement, message: string) => {
    const banner = Array.from(form.querySelectorAll<HTMLElement>('div')).find(
      (element) => element.textContent?.trim() === message
    );

    if (!banner) {
      return;
    }

    if (banner.tabIndex < 0) {
      banner.tabIndex = -1;
    }

    scrollAndFocusElement(banner);
  };

  const focusFirstError = (form: HTMLFormElement, nextErrors: Record<string, string>) => {
    const firstKey = ERROR_FOCUS_PRIORITY.find((key) => nextErrors[key]) || Object.keys(nextErrors)[0];
    if (!firstKey) {
      return;
    }

    if (firstKey === 'submit') {
      focusSubmitErrorBanner(form, nextErrors.submit);
      return;
    }

    focusFieldInForm(form, firstKey);
  };

  // Relationship form state
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [relationshipData, setRelationshipData] = useState<CreateContactRelationshipDTO>({
    related_contact_id: '',
    relationship_type: 'contact_person',
    relationship_label: '',
    is_bidirectional: true,
    notes: '',
  });

  useEffect(() => {
    if (mode === 'edit' && contact?.contact_id) {
      dispatch(fetchContactRelationships(contact.contact_id));
    }
  }, [dispatch, mode, contact?.contact_id]);

  useEffect(() => {
    if (isAddingRelationship && contacts.length === 0) {
      dispatch(fetchContacts({ limit: 100 }));
    }
  }, [dispatch, isAddingRelationship, contacts.length]);

  useEffect(() => {
    if (contact && mode === 'edit') {
      if (hydratedContactIdRef.current === contact.contact_id) {
        return;
      }

      setFormData({
        ...contact,
        birth_date: toDateInputValue(contact.birth_date),
        roles: contact.roles || [],
      });
      hydratedContactIdRef.current = contact.contact_id;
      setIsDirty(false);
    }
  }, [contact, mode]);

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty && !isSubmitting,
  });

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setRolesLoading(true);
        const roles = await contactsApiClient.listRoles();
        setAvailableRoles(roles || []);
      } catch (error) {
        console.error('Failed to load contact roles:', error);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, []);

  useEffect(() => {
    dispatch(fetchContactTags());
  }, [dispatch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setIsDirty(true);

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    if (name === 'phone' || name === 'mobile_phone') {
      clearErrors('phone', 'mobile_phone', 'submit');
      return;
    }

    clearErrors(name, 'submit');
  };

  const handleToggleRole = (roleName: string) => {
    setIsDirty(true);
    clearErrors('roles', 'email', 'submit');
    setFormData((prev) => {
      const roles = prev.roles || [];
      const clientSubRoles = [
        'Brain Injury Survivor',
        'Support Person',
        'Information',
        'Community Education',
      ];
      const isSelected = roles.includes(roleName);

      if (roleName === 'Client' && isSelected) {
        return {
          ...prev,
          roles: roles.filter((r) => r !== 'Client' && !clientSubRoles.includes(r)),
        };
      }

      if (isSelected) {
        return {
          ...prev,
          roles: roles.filter((r) => r !== roleName),
        };
      }

      return {
        ...prev,
        roles: [...roles, roleName],
      };
    });
  };

  const handleNoFixedAddressChange = (checked: boolean) => {
    setIsDirty(true);
    clearErrors(
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'submit'
    );
    setFormData((prev) => ({
      ...prev,
      no_fixed_address: checked,
      ...(checked ? {
        address_line1: '',
        address_line2: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: '',
      } : {}),
    }));
  };

  const handleAddTag = (tag: string) => {
    const normalized = tag.trim();
    if (!normalized) return;
    setIsDirty(true);
    clearErrors('tags', 'submit');
    setFormData((prev) => {
      const existing = prev.tags || [];
      if (existing.some((value) => value.toLowerCase() === normalized.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        tags: [...existing, normalized],
      };
    });
  };

  const handleRemoveTag = (tag: string) => {
    setIsDirty(true);
    clearErrors('tags', 'submit');
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((value) => value !== tag),
    }));
  };

  const validateForm = (form: HTMLFormElement): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    const selectedRoles = formData.roles || [];
    if (
      selectedRoles.some((roleName) => STAFF_ACCOUNT_ROLE_NAMES.has(roleName)) &&
      !(formData.email || '').trim()
    ) {
      newErrors.email = 'Email is required when assigning Staff or Executive Director roles';
    }

    if (formData.phone && !/^[\d\s+() -]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.phone) {
      const digitCount = formData.phone.replace(/\D/g, '').length;
      if (digitCount > 0 && digitCount < 10) {
        newErrors.phone = 'Phone number must be at least 10 digits';
      }
    }

    if (formData.mobile_phone && !/^[\d\s+() -]+$/.test(formData.mobile_phone)) {
      newErrors.mobile_phone = 'Invalid mobile phone number format';
    }

    if (formData.mobile_phone) {
      const digitCount = formData.mobile_phone.replace(/\D/g, '').length;
      if (digitCount > 0 && digitCount < 10) {
        newErrors.mobile_phone = 'Mobile phone number must be at least 10 digits';
      }
    }

    if (formData.phn && !isMaskedPhn(formData.phn)) {
      const digitCount = formData.phn.replace(/\D/g, '').length;
      if (digitCount !== 10) {
        newErrors.phn = 'PHN must contain exactly 10 digits';
      }
    }

    if (formData.postal_code) {
      const postalError = validatePostalCode(formData.postal_code, formData.country);
      if (postalError) {
        newErrors.postal_code = postalError;
      }
    }

    const normalizedPhone = normalizePhoneForComparison(formData.phone);
    const normalizedMobilePhone = normalizePhoneForComparison(formData.mobile_phone);
    if (
      normalizedPhone &&
      normalizedMobilePhone &&
      normalizedPhone === normalizedMobilePhone &&
      !newErrors.phone &&
      !newErrors.mobile_phone
    ) {
      newErrors.phone = 'Phone and mobile phone must be different';
      newErrors.mobile_phone = 'Phone and mobile phone must be different';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      focusFirstError(form, newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (!validateForm(form)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanedData = buildContactMutationPayload(formData, mode);

      if (mode === 'create') {
        const result = await dispatch(createContact(cleanedData)).unwrap();
        setIsDirty(false);
        if (result.staffInvitation?.inviteUrl) {
          showSuccess(
            `Staff invitation created for ${result.staffInvitation.role}. Share this link: ${result.staffInvitation.inviteUrl}`
          );
        }
        showSuccess('Contact created successfully');
        if (onCreated) {
          onCreated(result);
          return;
        }
        if (returnToContactId) {
          navigate(`/contacts/${returnToContactId}/edit`);
        } else {
          navigate(`/contacts/${result.contact_id}`);
        }
      } else if (mode === 'edit' && contact?.contact_id) {
        const result = await dispatch(
          updateContact({
            contactId: contact.contact_id,
            data: cleanedData,
          })
        ).unwrap();
        setIsDirty(false);
        if (result.staffInvitation?.inviteUrl) {
          showSuccess(
            `Staff invitation created for ${result.staffInvitation.role}. Share this link: ${result.staffInvitation.inviteUrl}`
          );
        }
        showSuccess('Contact updated successfully');
        navigate(`/contacts/${contact.contact_id}`);
      }
    } catch (error) {
      const message = getErrorMessage(
        error,
        mode === 'create' ? 'Failed to create contact' : 'Failed to update contact'
      );
      console.error('Failed to save contact:', error);
      setErrors((prev) => ({
        ...prev,
        submit: message,
      }));
      showError(message);
      window.setTimeout(() => {
        focusSubmitErrorBanner(form, message);
      }, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === 'edit' && contact?.contact_id) {
      navigate(`/contacts/${contact.contact_id}`, { replace: true });
    } else {
      navigate('/contacts', { replace: true });
    }
  };

  // Relationship handlers
  const resetRelationshipForm = () => {
    setRelationshipData({
      related_contact_id: '',
      relationship_type: 'contact_person',
      relationship_label: '',
      is_bidirectional: true,
      notes: '',
    });
    setRelationshipSearch('');
    setIsAddingRelationship(false);
  };

  const handleSelectRelationshipContact = (c: ContactRecord) => {
    setRelationshipData((prev) => ({
      ...prev,
      related_contact_id: c.contact_id,
    }));
    setRelationshipSearch(`${c.first_name} ${c.last_name}`);
  };

  const handleRelationshipTypeChange = (type: RelationshipType) => {
    setRelationshipData((prev) => ({
      ...prev,
      relationship_type: type,
    }));
  };

  const handleRelationshipLabelChange = (label: string) => {
    setRelationshipData((prev) => ({
      ...prev,
      relationship_label: label,
    }));
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationshipData.related_contact_id || !contact?.contact_id) {
      showError('Please select a person');
      return;
    }

    try {
      await dispatch(
        createContactRelationship({ contactId: contact.contact_id, data: relationshipData })
      ).unwrap();
      showSuccess('Relationship added successfully');
      resetRelationshipForm();
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to add relationship'));
    }
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    const confirmed = await confirm(confirmPresets.delete('Relationship'));
    if (!confirmed) return;
    try {
      await dispatch(deleteContactRelationship(relationshipId)).unwrap();
    } catch (error) {
      console.error('Failed to delete relationship:', error);
    }
  };

  const handleNavigateToContact = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  const handleCreateNewContact = (searchText: string) => {
    const nameParts = searchText.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const params = new URLSearchParams();
    if (firstName) params.set('first_name', firstName);
    if (lastName) params.set('last_name', lastName);
    if (contact?.account_id) params.set('account_id', contact.account_id);
    if (contact?.contact_id) params.set('return_to', contact.contact_id);
    window.open(`/contacts/new?${params.toString()}`, '_blank');
  };

  // Filter contacts for relationship search (exclude current contact)
  const filteredContacts = contacts.filter(
    (c) =>
      c.contact_id !== contact?.contact_id &&
      (relationshipSearch === '' ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(relationshipSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(relationshipSearch.toLowerCase()))
  );

  return {
    formData,
    errors,
    isSubmitting,
    availableRoles,
    rolesLoading,
    relationships,
    relationshipsLoading,
    contacts,
    availableTags,
    isAddingRelationship,
    relationshipSearch,
    relationshipData,
    filteredContacts,
    handleChange,
    handleToggleRole,
    handleNoFixedAddressChange,
    handleAddTag,
    handleRemoveTag,
    handleSubmit,
    handleCancel,
    setIsAddingRelationship,
    setRelationshipSearch: (value: string) => setRelationshipSearch(value),
    handleSelectRelationshipContact,
    handleRelationshipTypeChange,
    handleRelationshipLabelChange,
    handleAddRelationship,
    handleDeleteRelationship,
    resetRelationshipForm,
    handleNavigateToContact,
    handleCreateNewContact,
    confirmDialogState: dialogState,
    handleConfirmDialogConfirm: handleConfirm,
    handleConfirmDialogCancel: handleConfirmCancel,
  };
}
