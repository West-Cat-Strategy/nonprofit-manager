import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
export declare const listCommittees: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const listMeetings: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getMeetingDetail: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createMeeting: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateMeeting: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const addAgendaItem: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const reorderAgenda: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const addMotion: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateMotion: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createActionItem: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getMinutesDraft: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=meetingController.d.ts.map