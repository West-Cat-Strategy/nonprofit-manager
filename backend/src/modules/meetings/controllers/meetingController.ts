import { Response, NextFunction } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { meetingService } from '../services/meetingService';
import { notFoundMessage, unauthorized } from '@utils/responseHelpers';

export const listCommittees = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }
    const committees = await meetingService.listCommittees();
    res.json({ committees });
  } catch (error) {
    next(error);
  }
};

export const listMeetings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }
    const query = (req.validatedQuery ?? req.query) as {
      committee_id?: string;
      status?: string;
      from?: string;
      to?: string;
      limit?: number | string;
    };
    const parsedLimit =
      typeof query.limit === 'number'
        ? query.limit
        : parseInt(String(query.limit ?? ''), 10);
    const meetings = await meetingService.listMeetings({
      committee_id: query.committee_id,
      status: query.status,
      from: query.from,
      to: query.to,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
    res.json({ meetings });
  } catch (error) {
    next(error);
  }
};

export const getMeetingDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }
    const detail = await meetingService.getMeetingDetail(req.params.id);
    if (!detail) {
      notFoundMessage(res, 'Meeting not found');
      return;
    }
    res.json(detail);
  } catch (error) {
    next(error);
  }
};

export const createMeeting = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }

    const meeting = await meetingService.createMeeting(
      {
        committee_id: req.body.committee_id ?? null,
        meeting_type: req.body.meeting_type,
        title: req.body.title,
        starts_at: req.body.starts_at,
        ends_at: req.body.ends_at ?? null,
        location: req.body.location ?? null,
        presiding_contact_id: req.body.presiding_contact_id ?? null,
        secretary_contact_id: req.body.secretary_contact_id ?? null,
      },
      req.user.id
    );

    res.status(201).json({ meeting });
  } catch (error) {
    next(error);
  }
};

export const updateMeeting = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }

    const meeting = await meetingService.updateMeeting(req.params.id, req.body, req.user.id);
    if (!meeting) {
      notFoundMessage(res, 'Meeting not found');
      return;
    }
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
};

export const addAgendaItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }

    const agendaItem = await meetingService.addAgendaItem(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description ?? null,
        item_type: req.body.item_type,
        duration_minutes: req.body.duration_minutes ?? null,
        presenter_contact_id: req.body.presenter_contact_id ?? null,
      },
      req.user.id
    );

    res.status(201).json({ agendaItem });
  } catch (error) {
    next(error);
  }
};

export const reorderAgenda = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }

    await meetingService.reorderAgendaItems(req.params.id, req.body.orderedIds, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addMotion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }

    const motion = await meetingService.addMotion(
      req.params.id,
      {
        agenda_item_id: req.body.agenda_item_id ?? null,
        parent_motion_id: req.body.parent_motion_id ?? null,
        text: req.body.text,
        moved_by_contact_id: req.body.moved_by_contact_id ?? null,
        seconded_by_contact_id: req.body.seconded_by_contact_id ?? null,
      },
      req.user.id
    );

    res.status(201).json({ motion });
  } catch (error) {
    next(error);
  }
};

export const updateMotion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }

    const motion = await meetingService.updateMotion(req.params.motionId, req.body, req.user.id);
    if (!motion) {
      notFoundMessage(res, 'Motion not found');
      return;
    }
    res.json({ motion });
  } catch (error) {
    next(error);
  }
};

export const createActionItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }

    const item = await meetingService.createActionItem(
      req.params.id,
      {
        motion_id: req.body.motion_id ?? null,
        subject: req.body.subject,
        description: req.body.description ?? null,
        assigned_contact_id: req.body.assigned_contact_id ?? null,
        due_date: req.body.due_date ?? null,
      },
      req.user.id
    );

    res.status(201).json({ actionItem: item });
  } catch (error) {
    next(error);
  }
};

export const getMinutesDraft = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      unauthorized(res, 'Unauthorized');
      return;
    }
    const draft = await meetingService.generateMinutesDraft(req.params.id);
    if (!draft) {
      notFoundMessage(res, 'Meeting not found');
      return;
    }
    res.json(draft);
  } catch (error) {
    next(error);
  }
};
