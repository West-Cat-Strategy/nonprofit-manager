import { WorkflowCoverageReportService } from '../../services/workflowCoverageReportService';

describe('WorkflowCoverageReportService', () => {
  const query = jest.fn();
  let service: WorkflowCoverageReportService;

  beforeEach(() => {
    query.mockReset();
    service = new WorkflowCoverageReportService({ query } as any);
  });

  it('maps workflow coverage rows into items and summary totals', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          case_id: 'case-1',
          case_number: 'C-001',
          case_title: 'Housing intake',
          contact_name: 'Jamie Rivera',
          assigned_to: 'user-1',
          assigned_to_name: 'Alex Kim',
          status_name: 'Active',
          status_type: 'active',
          missing_conversation_resolution_count: '2',
          missing_appointment_note_count: '1',
          missing_appointment_outcome_count: '1',
          missing_follow_up_note_count: '0',
          missing_follow_up_outcome_count: '1',
          missing_reminder_offer_count: '1',
          missing_attendance_linkage_count: '0',
          missing_case_status_outcome_count: '0',
          total_gaps: '6',
        },
      ],
    });

    const result = await service.getWorkflowCoverageReport('org-1');

    expect(result.items).toEqual([
      {
        caseId: 'case-1',
        caseNumber: 'C-001',
        caseTitle: 'Housing intake',
        contactName: 'Jamie Rivera',
        assignedToId: 'user-1',
        assignedToName: 'Alex Kim',
        statusName: 'Active',
        statusType: 'active',
        missingConversationResolutionCount: 2,
        missingAppointmentNoteCount: 1,
        missingAppointmentOutcomeCount: 1,
        missingFollowUpNoteCount: 0,
        missingFollowUpOutcomeCount: 1,
        missingReminderOfferCount: 1,
        missingAttendanceLinkageCount: 0,
        missingCaseStatusOutcomeCount: 0,
        totalGaps: 6,
      },
    ]);

    expect(result.summary).toEqual({
      casesWithGaps: 1,
      missingConversationResolutionCount: 2,
      missingAppointmentNoteCount: 1,
      missingAppointmentOutcomeCount: 1,
      missingFollowUpNoteCount: 0,
      missingFollowUpOutcomeCount: 1,
      missingReminderOfferCount: 1,
      missingAttendanceLinkageCount: 0,
      missingCaseStatusOutcomeCount: 0,
      totalGaps: 6,
    });

    const [sql, values] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WITH base_cases AS');
    expect(sql).toContain('final_rows.total_gaps > 0');
    expect(values).toEqual(['org-1']);
  });

  it('applies owner, status, and missing filters in the generated query', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await service.getWorkflowCoverageReport('org-1', {
      ownerId: 'user-7',
      statusType: 'review',
      missing: 'outcome',
    });

    const [sql, values] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('c.assigned_to = $2');
    expect(sql).toContain('cs.status_type = $3');
    expect(sql).toContain('missing_case_status_outcome_count > 0');
    expect(values).toEqual(['org-1', 'user-7', 'review']);
  });
});
