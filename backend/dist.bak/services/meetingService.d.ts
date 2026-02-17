import type { Committee, Meeting, MeetingAgendaItem, MeetingMotion, MeetingActionItem, MeetingDetail } from '../types/meeting';
export declare const listCommittees: () => Promise<Committee[]>;
export declare const listMeetings: (filters: {
    committee_id?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
}) => Promise<Meeting[]>;
export declare const getMeetingDetail: (meetingId: string) => Promise<MeetingDetail | null>;
export declare const createMeeting: (input: {
    committee_id?: string | null;
    meeting_type: Meeting["meeting_type"];
    title: string;
    starts_at: string;
    ends_at?: string | null;
    location?: string | null;
    presiding_contact_id?: string | null;
    secretary_contact_id?: string | null;
}, userId: string) => Promise<Meeting>;
export declare const updateMeeting: (meetingId: string, input: Partial<{
    committee_id: string | null;
    meeting_type: Meeting["meeting_type"];
    title: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    status: Meeting["status"];
    presiding_contact_id: string | null;
    secretary_contact_id: string | null;
    minutes_notes: string | null;
}>, userId: string) => Promise<Meeting | null>;
export declare const addAgendaItem: (meetingId: string, input: {
    title: string;
    description?: string | null;
    item_type?: MeetingAgendaItem["item_type"];
    duration_minutes?: number | null;
    presenter_contact_id?: string | null;
}, userId: string) => Promise<MeetingAgendaItem>;
export declare const reorderAgendaItems: (meetingId: string, orderedIds: string[], userId: string) => Promise<void>;
export declare const addMotion: (meetingId: string, input: {
    agenda_item_id?: string | null;
    parent_motion_id?: string | null;
    text: string;
    moved_by_contact_id?: string | null;
    seconded_by_contact_id?: string | null;
}, userId: string) => Promise<MeetingMotion>;
export declare const updateMotion: (motionId: string, input: Partial<{
    status: MeetingMotion["status"];
    votes_for: number | null;
    votes_against: number | null;
    votes_abstain: number | null;
    result_notes: string | null;
}>, userId: string) => Promise<MeetingMotion | null>;
export declare const createActionItem: (meetingId: string, input: {
    motion_id?: string | null;
    subject: string;
    description?: string | null;
    assigned_contact_id?: string | null;
    due_date?: string | null;
}, userId: string) => Promise<MeetingActionItem>;
export declare const generateMinutesDraft: (meetingId: string) => Promise<{
    markdown: string;
} | null>;
//# sourceMappingURL=meetingService.d.ts.map