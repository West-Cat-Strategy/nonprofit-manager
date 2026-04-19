-- Migration 097: Allow referral-form submissions in the public submission ledger
-- Created: 2026-04-19
-- Description: Align the public_submissions submission_type constraint with the
-- live public website form service, which already records referral-form intake
-- submissions through the idempotent ledger.

ALTER TABLE public_submissions
  DROP CONSTRAINT IF EXISTS public_submissions_submission_type_check;

ALTER TABLE public_submissions
  ADD CONSTRAINT public_submissions_submission_type_check
  CHECK (
    submission_type IN (
      'contact-form',
      'newsletter-signup',
      'volunteer-interest-form',
      'referral-form',
      'donation-form'
    )
  );
