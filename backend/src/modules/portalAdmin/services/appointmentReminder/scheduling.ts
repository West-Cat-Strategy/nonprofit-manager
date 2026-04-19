import pool from '@config/database';
import {
  ReminderCadenceKey,
  ReminderChannel,
} from './types';
import {
  cancelAllActiveJobs,
  cancelJobsMissingCombos,
  cancelJobsOutsideWindow,
  cancelPendingJobsForAppointment as cancelPendingJobsForAppointmentRepo,
  cancelPendingJobsForNonSendableAppointments as cancelPendingJobsForNonSendableAppointmentsRepo,
  claimDueJobs as claimDueJobsRepo,
  getReminderContext,
  listJobsForAppointment,
  upsertReminderJobs,
} from './repository';

const STALE_PROCESSING_TIMEOUT_MINUTES = 10;

const CADENCE_MINUTES: Record<ReminderCadenceKey, number> = {
  '24h': 24 * 60,
  '2h': 2 * 60,
};

const CADENCE_KEYS: ReminderCadenceKey[] = ['24h', '2h'];
const CHANNELS: ReminderChannel[] = ['email', 'sms'];

const computeSchedule = (
  startTime: Date
): Array<{ cadenceKey: ReminderCadenceKey; scheduledFor: Date }> =>
  CADENCE_KEYS.map((cadenceKey) => ({
    cadenceKey,
    scheduledFor: new Date(startTime.getTime() - CADENCE_MINUTES[cadenceKey] * 60_000),
  }));

export async function syncJobsForAppointment(appointmentId: string) {
  const appointment = await getReminderContext(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.status !== 'confirmed' || appointment.start_time <= new Date()) {
    await cancelPendingJobsForAppointment(appointmentId,
      appointment.status !== 'confirmed'
        ? `appointment_status_${appointment.status}`
        : 'appointment_start_passed'
    );
    return [];
  }

  const now = new Date();
  const schedules = computeSchedule(appointment.start_time);
  const activeCombos: Array<{
    cadenceKey: ReminderCadenceKey;
    channel: ReminderChannel;
    scheduledFor: Date;
  }> = [];
  const outsideWindowCombos: Array<{
    cadenceKey: ReminderCadenceKey;
    channel: ReminderChannel;
  }> = [];

  for (const schedule of schedules) {
    for (const channel of CHANNELS) {
      if (schedule.scheduledFor <= now) {
        outsideWindowCombos.push({
          cadenceKey: schedule.cadenceKey,
          channel,
        });
        continue;
      }

      activeCombos.push({
        cadenceKey: schedule.cadenceKey,
        channel,
        scheduledFor: schedule.scheduledFor,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (outsideWindowCombos.length > 0) {
      await cancelJobsOutsideWindow(client, appointmentId, outsideWindowCombos);
    }

    if (activeCombos.length > 0) {
      await upsertReminderJobs(client, appointmentId, activeCombos);
      await cancelJobsMissingCombos(
        client,
        appointmentId,
        activeCombos.map((combo) => ({ cadenceKey: combo.cadenceKey, channel: combo.channel }))
      );
    } else {
      await cancelAllActiveJobs(client, appointmentId);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return listJobsForAppointment(appointmentId);
}

export async function cancelPendingJobsForAppointment(
  appointmentId: string,
  reason: string,
  modifiedBy?: string | null
): Promise<number> {
  const cancellationReason = `${reason}${modifiedBy ? `:${modifiedBy}` : ''}`;
  return cancelPendingJobsForAppointmentRepo(appointmentId, cancellationReason);
}

export const cancelPendingJobsForNonSendableAppointments = async (limit = 400): Promise<number> => {
  return cancelPendingJobsForNonSendableAppointmentsRepo(limit);
};

export const claimDueJobs = (batchSize: number) => {
  return claimDueJobsRepo(batchSize, STALE_PROCESSING_TIMEOUT_MINUTES);
};
