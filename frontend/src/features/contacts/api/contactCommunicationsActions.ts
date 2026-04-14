import { sendContactAppointmentReminder } from './contactCasesApi';

export const resendContactAppointmentReminder = async (
  appointmentId: string,
  options: { sendEmail?: boolean; sendSms?: boolean; customMessage?: string }
): Promise<void> => {
  await sendContactAppointmentReminder(appointmentId, options);
};
