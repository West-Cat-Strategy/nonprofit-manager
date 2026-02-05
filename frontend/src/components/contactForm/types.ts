import type { Contact as StoreContact } from '../../store/slices/contactsSlice';

export type ContactFormValues = {
  contact_id?: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  salutation?: string | null;
  suffix?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  pronouns?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  job_title?: string | null;
  department?: string | null;
  preferred_contact_method?: string | null;
  do_not_email?: boolean;
  do_not_phone?: boolean;
  notes?: string | null;
  is_active?: boolean;
  roles?: string[];
};

export type ContactFormErrors = Record<string, string>;

export type ContactRecord = StoreContact;
