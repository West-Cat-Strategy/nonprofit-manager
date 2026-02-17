"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinutesDraft = exports.createActionItem = exports.updateMotion = exports.addMotion = exports.reorderAgenda = exports.addAgendaItem = exports.updateMeeting = exports.createMeeting = exports.getMeetingDetail = exports.listMeetings = exports.listCommittees = void 0;
const express_validator_1 = require("express-validator");
const meetingService = __importStar(require("../services/meetingService"));
const listCommittees = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const committees = await meetingService.listCommittees();
        res.json({ committees });
    }
    catch (error) {
        next(error);
    }
};
exports.listCommittees = listCommittees;
const listMeetings = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
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
    }
    catch (error) {
        next(error);
    }
};
exports.listMeetings = listMeetings;
const getMeetingDetail = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const detail = await meetingService.getMeetingDetail(req.params.id);
        if (!detail) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }
        res.json(detail);
    }
    catch (error) {
        next(error);
    }
};
exports.getMeetingDetail = getMeetingDetail;
const createMeeting = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const meeting = await meetingService.createMeeting({
            committee_id: req.body.committee_id ?? null,
            meeting_type: req.body.meeting_type,
            title: req.body.title,
            starts_at: req.body.starts_at,
            ends_at: req.body.ends_at ?? null,
            location: req.body.location ?? null,
            presiding_contact_id: req.body.presiding_contact_id ?? null,
            secretary_contact_id: req.body.secretary_contact_id ?? null,
        }, req.user.id);
        res.status(201).json({ meeting });
    }
    catch (error) {
        next(error);
    }
};
exports.createMeeting = createMeeting;
const updateMeeting = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const meeting = await meetingService.updateMeeting(req.params.id, req.body, req.user.id);
        if (!meeting) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }
        res.json({ meeting });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMeeting = updateMeeting;
const addAgendaItem = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const agendaItem = await meetingService.addAgendaItem(req.params.id, {
            title: req.body.title,
            description: req.body.description ?? null,
            item_type: req.body.item_type,
            duration_minutes: req.body.duration_minutes ?? null,
            presenter_contact_id: req.body.presenter_contact_id ?? null,
        }, req.user.id);
        res.status(201).json({ agendaItem });
    }
    catch (error) {
        next(error);
    }
};
exports.addAgendaItem = addAgendaItem;
const reorderAgenda = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        await meetingService.reorderAgendaItems(req.params.id, req.body.orderedIds, req.user.id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.reorderAgenda = reorderAgenda;
const addMotion = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const motion = await meetingService.addMotion(req.params.id, {
            agenda_item_id: req.body.agenda_item_id ?? null,
            parent_motion_id: req.body.parent_motion_id ?? null,
            text: req.body.text,
            moved_by_contact_id: req.body.moved_by_contact_id ?? null,
            seconded_by_contact_id: req.body.seconded_by_contact_id ?? null,
        }, req.user.id);
        res.status(201).json({ motion });
    }
    catch (error) {
        next(error);
    }
};
exports.addMotion = addMotion;
const updateMotion = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const motion = await meetingService.updateMotion(req.params.motionId, req.body, req.user.id);
        if (!motion) {
            res.status(404).json({ error: 'Motion not found' });
            return;
        }
        res.json({ motion });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMotion = updateMotion;
const createActionItem = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const item = await meetingService.createActionItem(req.params.id, {
            motion_id: req.body.motion_id ?? null,
            subject: req.body.subject,
            description: req.body.description ?? null,
            assigned_contact_id: req.body.assigned_contact_id ?? null,
            due_date: req.body.due_date ?? null,
        }, req.user.id);
        res.status(201).json({ actionItem: item });
    }
    catch (error) {
        next(error);
    }
};
exports.createActionItem = createActionItem;
const getMinutesDraft = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const draft = await meetingService.generateMinutesDraft(req.params.id);
        if (!draft) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }
        res.json(draft);
    }
    catch (error) {
        next(error);
    }
};
exports.getMinutesDraft = getMinutesDraft;
//# sourceMappingURL=meetingController.js.map