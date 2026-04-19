import {
  AppointmentReminderListResult,
} from './types';
import {
  listDeliveriesForAppointment,
  listJobsForAppointment,
} from './repository';

export async function listAppointmentReminders(
  appointmentId: string
): Promise<AppointmentReminderListResult> {
  const [jobs, deliveries] = await Promise.all([
    listJobsForAppointment(appointmentId),
    listDeliveriesForAppointment(appointmentId),
  ]);

  return { jobs, deliveries };
}
