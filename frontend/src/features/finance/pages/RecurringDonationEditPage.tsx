import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  clearSelectedRecurringDonation,
  fetchRecurringDonationPlanById,
  updateRecurringDonationPlan,
} from '../state';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
} from '../../../components/ui';

const RecurringDonationEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedPlan: plan, loading, error } = useAppSelector(
    (state) => state.finance.recurring
  );
  const [amount, setAmount] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [designation, setDesignation] = useState('');
  const [notes, setNotes] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchRecurringDonationPlanById(id));
    }

    return () => {
      dispatch(clearSelectedRecurringDonation());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!plan) return;
    setAmount(plan.amount.toFixed(2));
    setCampaignName(plan.campaign_name || '');
    setDesignation(plan.designation || '');
    setNotes(plan.notes || '');
  }, [plan]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) return;

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSaveError('Amount must be a positive number.');
      return;
    }

    try {
      setSaveError(null);
      await dispatch(
        updateRecurringDonationPlan({
          planId: id,
          planData: {
            amount: parsedAmount,
            campaign_name: campaignName.trim() || null,
            designation: designation.trim() || null,
            notes: notes.trim() || null,
          },
        })
      ).unwrap();
      navigate(`/recurring-donations/${id}`);
    } catch (updateError) {
      setSaveError(
        updateError instanceof Error ? updateError.message : 'Unable to update recurring donation plan.'
      );
    }
  };

  if (loading && !plan) {
    return <div className="p-4 sm:p-6"><LoadingState label="Loading recurring donation plan..." /></div>;
  }

  if (error && !plan) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          message={error}
          onRetry={() => id && dispatch(fetchRecurringDonationPlanById(id))}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState message="Recurring donation plan not found." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Edit Recurring Donation"
        description="Changes to amount and plan notes apply to the next billing cycle."
        actions={
          <div className="flex gap-2">
            <SecondaryButton onClick={() => navigate(`/recurring-donations/${plan.recurring_plan_id}`)}>
              Cancel
            </SecondaryButton>
          </div>
        }
      />

      <SectionCard title="Plan Details" subtitle={`Editing ${plan.donor_name || plan.donor_email}`}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-app-text">Monthly Amount</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-md border border-app-border px-4 py-2"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-app-text">Campaign</span>
              <input
                type="text"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                className="w-full rounded-md border border-app-border px-4 py-2"
                placeholder="Monthly donors"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-app-text">Designation</span>
              <input
                type="text"
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                className="w-full rounded-md border border-app-border px-4 py-2"
                placeholder="General fund"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-app-text">Notes</span>
            <textarea
              rows={6}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-md border border-app-border px-4 py-2"
              placeholder="Internal staff notes for this monthly plan"
            />
          </label>

          {saveError ? <ErrorState message={saveError} /> : null}

          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="submit" disabled={loading}>
              Save Changes
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={() => navigate(`/recurring-donations/${plan.recurring_plan_id}`)}
            >
              Back to Plan
            </SecondaryButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
};

export default RecurringDonationEditPage;
