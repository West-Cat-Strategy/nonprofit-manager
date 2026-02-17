"use strict";
/**
 * Contact Notes Controller
 * Handles HTTP requests for contact notes
 */
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
exports.deleteContactNote = exports.updateContactNote = exports.createContactNote = exports.getContactNoteById = exports.getContactNotes = void 0;
const contactNoteService = __importStar(require("../services/contactNoteService"));
/**
 * GET /api/contacts/:contactId/notes
 * Get all notes for a contact
 */
const getContactNotes = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const notes = await contactNoteService.getContactNotes(contactId);
        res.json(notes);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactNotes = getContactNotes;
/**
 * GET /api/contacts/notes/:noteId
 * Get a single note by ID
 */
const getContactNoteById = async (req, res, next) => {
    try {
        const { noteId } = req.params;
        const note = await contactNoteService.getContactNoteById(noteId);
        if (!note) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        res.json(note);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactNoteById = getContactNoteById;
/**
 * POST /api/contacts/:contactId/notes
 * Create a new note for a contact
 */
const createContactNote = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const userId = req.user.id;
        const note = await contactNoteService.createContactNote(contactId, req.body, userId);
        res.status(201).json(note);
    }
    catch (error) {
        next(error);
    }
};
exports.createContactNote = createContactNote;
/**
 * PUT /api/contacts/notes/:noteId
 * Update a note
 */
const updateContactNote = async (req, res, next) => {
    try {
        const { noteId } = req.params;
        const note = await contactNoteService.updateContactNote(noteId, req.body);
        if (!note) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        res.json(note);
    }
    catch (error) {
        next(error);
    }
};
exports.updateContactNote = updateContactNote;
/**
 * DELETE /api/contacts/notes/:noteId
 * Delete a note
 */
const deleteContactNote = async (req, res, next) => {
    try {
        const { noteId } = req.params;
        const success = await contactNoteService.deleteContactNote(noteId);
        if (!success) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteContactNote = deleteContactNote;
//# sourceMappingURL=contactNotesController.js.map