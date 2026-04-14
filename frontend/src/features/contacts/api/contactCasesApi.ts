import { casesApiClient } from '../../cases/api/casesApiClient';
import type { CaseWithDetails } from '../../../types/case';

export const listContactCasesForContact = async (contactId: string): Promise<CaseWithDetails[]> => {
  const response = await casesApiClient.listCases({
    contactId,
    limit: 100,
    sortBy: 'updated_at',
    sortOrder: 'desc',
  });

  return Array.isArray(response.cases) ? response.cases : [];
};

export const sendContactAppointmentReminder = async (
  appointmentId: string,
  options: { sendEmail?: boolean; sendSms?: boolean; customMessage?: string }
): Promise<void> => {
  await casesApiClient.sendCaseAppointmentReminder(appointmentId, options);
};
