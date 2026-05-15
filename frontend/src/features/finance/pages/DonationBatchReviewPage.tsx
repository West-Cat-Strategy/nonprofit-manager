/**
 * MODULE-OWNERSHIP: finance page
 *
 * Donation batch review and control-total workflow.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type {
  DonationBatch,
  DonationBatchListResponse,
  DonationBatchStatus,
} from '../../../types/donation';
import { formatCurrency, formatDate } from '../../../utils/format';
import api from '../../../services/api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatCard,
} from '../../../components/ui';

const statusLabel: Record<DonationBatchStatus, string> = {
  open: 'Open',
  under_review: 'Review',
  approved: 'Approved',
  posted: 'Posted',
};

const actionClass =
  'inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 py-2 text-sm font-semibold text-app-text transition hover:border-app-accent hover:text-app-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const primaryActionClass =
  'inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] bg-[var(--app-accent)] px-3 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition hover:bg-[var(--app-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const today = new Date().toISOString().slice(0, 10);

const readError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Donation batch request failed';

const DonationBatchReviewPage: React.FC = () => {
  const [batches, setBatches] = useState<DonationBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: `Donation batch ${today}`,
    date_from: today,
    date_to: today,
    expected_count: '0',
    expected_amount: '0.00',
    currency: 'CAD',
    notes: '',
  });

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.batch_id === selectedBatchId) || batches[0] || null,
    [batches, selectedBatchId]
  );

  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<DonationBatchListResponse>('/donations/batches');
      const nextBatches = response.data.data;
      setBatches(nextBatches);
      setSelectedBatchId((current) =>
        current && nextBatches.some((batch) => batch.batch_id === current)
          ? current
          : nextBatches[0]?.batch_id || null
      );
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBatches();
  }, []);

  const createBatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.post<DonationBatch>('/donations/batches', {
        ...form,
        expected_count: Number.parseInt(form.expected_count || '0', 10),
        expected_amount: Number.parseFloat(form.expected_amount || '0'),
      });
      setBatches((current) => [response.data, ...current]);
      setSelectedBatchId(response.data.batch_id);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (action: 'close' | 'reopen' | 'approve' | 'post') => {
    if (!selectedBatch) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.post<DonationBatch>(
        `/donations/batches/${selectedBatch.batch_id}/${action}`
      );
      setBatches((current) =>
        current.map((batch) =>
          batch.batch_id === response.data.batch_id ? response.data : batch
        )
      );
      setSelectedBatchId(response.data.batch_id);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const blockingExceptionCount =
    selectedBatch?.exception_preview.filter((exception) => exception.severity === 'blocking')
      .length || 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Donation Batch Review"
        description="Review donation control totals, restrictions, exceptions, and finance approval state."
        actions={
          <button type="button" className={actionClass} onClick={loadBatches}>
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        }
      />

      {error && <ErrorState message={error} />}

      <SectionCard title="Create Batch" subtitle="Capture the expected count and amount before review.">
        <form onSubmit={createBatch} className="grid grid-cols-1 gap-3 lg:grid-cols-7">
          <label className="lg:col-span-2">
            <span className="text-xs font-semibold uppercase text-app-text-muted">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1 w-full rounded-md border border-app-border px-3 py-2"
              required
            />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase text-app-text-muted">From</span>
            <input
              type="date"
              value={form.date_from}
              onChange={(event) => setForm({ ...form, date_from: event.target.value })}
              className="mt-1 w-full rounded-md border border-app-border px-3 py-2"
              required
            />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase text-app-text-muted">To</span>
            <input
              type="date"
              value={form.date_to}
              onChange={(event) => setForm({ ...form, date_to: event.target.value })}
              className="mt-1 w-full rounded-md border border-app-border px-3 py-2"
              required
            />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase text-app-text-muted">Count</span>
            <input
              type="number"
              min="0"
              value={form.expected_count}
              onChange={(event) => setForm({ ...form, expected_count: event.target.value })}
              className="mt-1 w-full rounded-md border border-app-border px-3 py-2"
              required
            />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase text-app-text-muted">Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.expected_amount}
              onChange={(event) => setForm({ ...form, expected_amount: event.target.value })}
              className="mt-1 w-full rounded-md border border-app-border px-3 py-2"
              required
            />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase text-app-text-muted">Currency</span>
            <input
              value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })}
              className="mt-1 w-full rounded-md border border-app-border px-3 py-2"
              maxLength={3}
              required
            />
          </label>
          <label className="lg:col-span-6">
            <span className="text-xs font-semibold uppercase text-app-text-muted">Notes</span>
            <input
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="mt-1 w-full rounded-md border border-app-border px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className={primaryActionClass} disabled={submitting}>
              <ClipboardDocumentCheckIcon className="h-4 w-4" aria-hidden="true" />
              Create
            </button>
          </div>
        </form>
      </SectionCard>

      {loading ? (
        <LoadingState label="Loading donation batches..." />
      ) : batches.length === 0 ? (
        <EmptyState
          title="No donation batches"
          description="Create the first batch from the control totals above."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
          <SectionCard title="Batches">
            <div className="space-y-2">
              {batches.map((batch) => (
                <button
                  key={batch.batch_id}
                  type="button"
                  onClick={() => setSelectedBatchId(batch.batch_id)}
                  className={`w-full rounded-md border px-3 py-3 text-left transition ${
                    selectedBatch?.batch_id === batch.batch_id
                      ? 'border-app-accent bg-app-accent-soft'
                      : 'border-app-border-muted bg-app-bg hover:border-app-accent'
                  }`}
                >
                  <span className="block text-sm font-semibold text-app-text">{batch.name}</span>
                  <span className="mt-1 block text-xs text-app-text-muted">
                    {formatDate(batch.date_from)} - {formatDate(batch.date_to)}
                  </span>
                  <span className="mt-2 inline-flex rounded-full bg-app-surface-muted px-2 py-1 text-xs font-semibold text-app-text-muted">
                    {statusLabel[batch.status]}
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>

          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <StatCard
                  label="Expected"
                  value={formatCurrency(selectedBatch.control_summary.expected_amount)}
                  trend={`${selectedBatch.control_summary.expected_count} gifts`}
                />
                <StatCard
                  label="Actual"
                  value={formatCurrency(selectedBatch.control_summary.actual_amount)}
                  trend={`${selectedBatch.control_summary.actual_count} gifts`}
                />
                <StatCard
                  label="Amount Difference"
                  value={formatCurrency(selectedBatch.control_summary.difference_amount)}
                />
                <StatCard
                  label="Exceptions"
                  value={selectedBatch.exception_preview.length}
                  trend={`${blockingExceptionCount} blocking`}
                />
              </div>

              <SectionCard
                title={selectedBatch.name}
                subtitle={`${statusLabel[selectedBatch.status]} batch for ${formatDate(selectedBatch.date_from)} through ${formatDate(selectedBatch.date_to)}`}
                actions={
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={actionClass}
                      disabled={submitting || selectedBatch.status !== 'open'}
                      onClick={() => void runAction('close')}
                    >
                      <LockClosedIcon className="h-4 w-4" aria-hidden="true" />
                      Close
                    </button>
                    <button
                      type="button"
                      className={actionClass}
                      disabled={
                        submitting ||
                        !['under_review', 'approved'].includes(selectedBatch.status)
                      }
                      onClick={() => void runAction('reopen')}
                    >
                      <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                      Reopen
                    </button>
                    <button
                      type="button"
                      className={actionClass}
                      disabled={
                        submitting ||
                        selectedBatch.status !== 'under_review' ||
                        blockingExceptionCount > 0
                      }
                      onClick={() => void runAction('approve')}
                    >
                      <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      className={primaryActionClass}
                      disabled={submitting || selectedBatch.status !== 'approved'}
                      onClick={() => void runAction('post')}
                    >
                      <ClipboardDocumentCheckIcon className="h-4 w-4" aria-hidden="true" />
                      Post
                    </button>
                  </div>
                }
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-app-text">Restricted Funds</h3>
                    <div className="mt-3 overflow-hidden rounded-md border border-app-border-muted">
                      <table className="min-w-full divide-y divide-app-border-muted text-sm">
                        <thead className="bg-app-surface-muted text-left text-xs uppercase text-app-text-muted">
                          <tr>
                            <th className="px-3 py-2">Fund</th>
                            <th className="px-3 py-2">Restriction</th>
                            <th className="px-3 py-2 text-right">Count</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border-muted">
                          {selectedBatch.restricted_fund_summary.map((fund) => (
                            <tr key={`${fund.restriction_type}:${fund.designation_label}`}>
                              <td className="px-3 py-2 font-medium text-app-text">
                                {fund.designation_label}
                              </td>
                              <td className="px-3 py-2 text-app-text-muted">
                                {fund.restriction_type.replace(/_/g, ' ')}
                              </td>
                              <td className="px-3 py-2 text-right">{fund.count}</td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(fund.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-app-text">Exception Preview</h3>
                    <div className="mt-3 space-y-2">
                      {selectedBatch.exception_preview.length === 0 ? (
                        <div className="rounded-md border border-app-border-muted bg-app-bg px-3 py-3 text-sm text-app-text-muted">
                          No control exceptions.
                        </div>
                      ) : (
                        selectedBatch.exception_preview.map((exception, index) => (
                          <div
                            key={`${exception.code}:${exception.donation_id || index}`}
                            className="rounded-md border border-app-border-muted bg-app-bg px-3 py-3"
                          >
                            <p className="flex items-start gap-2 text-sm font-semibold text-app-text">
                              <ExclamationTriangleIcon
                                className="mt-0.5 h-4 w-4 text-amber-600"
                                aria-hidden="true"
                              />
                              {exception.code.replace(/_/g, ' ')}
                            </p>
                            <p className="mt-1 text-sm text-app-text-muted">
                              {exception.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Audit Events">
                <div className="space-y-2">
                  {selectedBatch.audit_events.map((event) => (
                    <div
                      key={event.audit_event_id}
                      className="rounded-md border border-app-border-muted bg-app-bg px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-app-text">
                        {event.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-app-text-muted">
                        {formatDate(event.created_at)}: {event.from_status || 'new'} to{' '}
                        {event.to_status}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DonationBatchReviewPage;
