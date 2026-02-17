# CRM Enhancements

The CRM module has been upgraded with automated workflows and intelligence to help nonprofit managers prioritize their constituent engagement.

## Key Features

### Lead Scoring
- **Automated Prioritization**: Each contact is assigned a score based on their recent engagement, donation history, and volunteer activity.
- **Customizable Weighting**: Administrators can adjust which actions (e.g., attending an event vs. making a donation) contribute most to the score.
- **Visual Indicators**: High-priority leads are highlighted in lists with distinctive color-coded icons.

### Follow-Up Reminders
- **Smart Reminders**: Automated reminders are generated based on contact milestones (e.g., 3 months since last donation) or manual tags.
- **Workflow Integration**: Reminders appear on the user's dashboard and can be converted directly into tasks.
- **Communication Logging**: One-click logging for emails, calls, and meetings linked to the reminder.

### Relationship Mapping
- **Interconnected Profiles**: Map relationships between donors, volunteers, and organizations (e.g., spouse, employee, board member).
- **Influence Tracking**: Visualize how connections within your network can lead to higher engagement.

## How to Use

### Configuring Lead Scoring
1. Go to **Settings** > **CRM Configuration**.
2. Define the **Scoring Rules** (e.g., +10 points for a $100 donation).
3. The system will automatically update scores nightly (or can be triggered manually).

### Setting Up Reminders
1. On a **Contact Profile**, click **Add Follow-Up**.
2. Set the date and a brief description.
3. The reminder will pop up in the **Follow-Up Widget** on your dashboard when due.

## Technical Implementation

- **Lead Scoring Engine**: `backend/src/services/leadScoringService.ts` executes the scoring logic.
- **Reminder Service**: `backend/src/services/contactNoteService.ts` (enhanced with reminder flags and dates).
- **Frontend Components**:
    - `FollowUpReminders`: `frontend/src/components/FollowUpReminders.tsx`
    - `LeadScoreBadge`: Reusable component for displaying scores.
