import { casesApiClient } from '../../cases/api/casesApiClient';

export const resendContactAppointmentReminder = async (
  appointmentId: string,
  options: { sendEmail?: boolean; sendSms?: boolean; customMessage?: string }
): Promise<void> => {
  await casesApiClient.sendCaseAppointmentReminder(appointmentId, options);
};
