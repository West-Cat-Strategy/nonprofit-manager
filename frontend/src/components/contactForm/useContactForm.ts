import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createContact,
  updateContact,
  fetchContactRelationships,
  createContactRelationship,
  deleteContactRelationship,
  fetchContacts,
} from '../../store/slices/contactsSlice';
import type { ContactRole, CreateContactRelationshipDTO, RelationshipType } from '../../types/contact';
import { useToast } from '../../contexts/useToast';
import api from '../../services/api';
import { validatePostalCode } from '../../utils/validation';
import type { ContactFormValues, ContactRecord } from './types';

interface UseContactFormProps {
  contact?: ContactRecord;
  mode: 'create' | 'edit';
  onCreated?: (contact: ContactRecord) => void;
  onCancel?: () => void;
}

export function useContactForm({ contact, mode, onCreated, onCancel }: UseContactFormProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const { relationships, relationshipsLoading, contacts } = useAppSelector((state) => state.contacts);
  const [availableRoles, setAvailableRoles] = useState<ContactRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Pre-fill from URL params when creating (e.g., from relationship "Create New Person")
  const urlFirstName = searchParams.get('first_name') || '';
  const urlLastName = searchParams.get('last_name') || '';
  const returnToContactId = searchParams.get('return_to');

  const [formData, setFormData] = useState<ContactFormValues>({
    first_name: mode === 'create' ? urlFirstName : '',
    last_name: mode === 'create' ? urlLastName : '',
    middle_name: '',
    salutation: '',
    suffix: '',
    birth_date: '',
    gender: '',
    pronouns: '',
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
    job_title: '',
    department: '',
    preferred_contact_method: 'email',
    do_not_email: false,
    do_not_phone: false,
    notes: '',
    is_active: true,
    roles: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setFormData({
        ...contact,
        roles: contact.roles || [],
      });
    }
  }, [contact, mode]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setRolesLoading(true);
        const response = await api.get('/contacts/roles');
        setAvailableRoles(response.data.roles || []);
      } catch (error) {
        console.error('Failed to load contact roles:', error);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleToggleRole = (roleName: string) => {
    setFormData((prev) => {
      const roles = prev.roles || [];
      return {
        ...prev,
        roles: roles.includes(roleName)
          ? roles.filter((r) => r !== roleName)
          : [...roles, roleName],
      };
    });
  };

  const handleNoFixedAddressChange = (checked: boolean) => {
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

  const validateForm = (): boolean => {
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

    if (formData.phone && !/^[\d\s+() -]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.mobile_phone && !/^[\d\s+() -]+$/.test(formData.mobile_phone)) {
      newErrors.mobile_phone = 'Invalid mobile phone number format';
    }

    if (formData.postal_code) {
      const postalError = validatePostalCode(formData.postal_code, formData.country);
      if (postalError) {
        newErrors.postal_code = postalError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanedData = {
        ...formData,
        middle_name: formData.middle_name || undefined,
        salutation: formData.salutation || undefined,
        suffix: formData.suffix || undefined,
        birth_date: formData.birth_date || undefined,
        gender: formData.gender || undefined,
        pronouns: formData.pronouns || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        mobile_phone: formData.mobile_phone || undefined,
        address_line1: formData.no_fixed_address ? undefined : (formData.address_line1 || undefined),
        address_line2: formData.no_fixed_address ? undefined : (formData.address_line2 || undefined),
        city: formData.no_fixed_address ? undefined : (formData.city || undefined),
        state_province: formData.no_fixed_address ? undefined : (formData.state_province || undefined),
        postal_code: formData.no_fixed_address ? undefined : (formData.postal_code || undefined),
        country: formData.no_fixed_address ? undefined : (formData.country || undefined),
        no_fixed_address: formData.no_fixed_address || false,
        job_title: formData.job_title || undefined,
        department: formData.department || undefined,
        preferred_contact_method: formData.preferred_contact_method || undefined,
        notes: formData.notes || undefined,
        roles: formData.roles || [],
      };

      if (mode === 'create') {
        const result = await dispatch(createContact(cleanedData)).unwrap();
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
        if (result.staffInvitation?.inviteUrl) {
          showSuccess(
            `Staff invitation created for ${result.staffInvitation.role}. Share this link: ${result.staffInvitation.inviteUrl}`
          );
        }
        showSuccess('Contact updated successfully');
        navigate(`/contacts/${contact.contact_id}`);
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      setErrors({ submit: 'Failed to save contact. Please try again.' });
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
      navigate(`/contacts/${contact.contact_id}`);
    } else {
      navigate('/contacts');
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
    } catch (error: any) {
      showError(error.message || 'Failed to add relationship');
    }
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    if (!confirm('Remove this relationship?')) return;
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
    isAddingRelationship,
    relationshipSearch,
    relationshipData,
    filteredContacts,
    handleChange,
    handleToggleRole,
    handleNoFixedAddressChange,
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
  };
}
