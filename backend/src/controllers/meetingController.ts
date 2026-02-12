import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import type { AuthRequest } from '@middleware/auth';
import { meetingService } from '@services';
import { notFoundMessage, unauthorized, validationErrorResponse } from '@utils/responseHelpers';

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
    const meetings = await meetingService.listMeetings({
      committee_id: typeof req.query.committee_id === 'string' ? req.query.committee_id : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
      limit: typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined,
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      validationErrorResponse(res, errors);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      validationErrorResponse(res, errors);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      validationErrorResponse(res, errors);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      validationErrorResponse(res, errors);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      validationErrorResponse(res, errors);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      validationErrorResponse(res, errors);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      validationErrorResponse(res, errors);
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
