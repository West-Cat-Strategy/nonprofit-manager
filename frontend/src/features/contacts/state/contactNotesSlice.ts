import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contactsApiClient } from '../api/contactsApiClient';
import type { ContactNote, CreateContactNoteDTO, UpdateContactNoteDTO } from '../../../types/contact';

export interface ContactNotesState {
  contactNotes: ContactNote[];
  notesLoading: boolean;
  error: string | null;
}

const initialState: ContactNotesState = {
  contactNotes: [],
  notesLoading: false,
  error: null,
};

export const fetchContactNotes = createAsyncThunk(
  'contactNotes/fetchContactNotes',
  async (contactId: string) => {
    const result = await contactsApiClient.listNotes(contactId);
    return result.notes;
  }
);

export const createContactNote = createAsyncThunk(
  'contactNotes/createContactNote',
  async ({ contactId, data }: { contactId: string; data: CreateContactNoteDTO }) => {
    return await contactsApiClient.createNote(contactId, data);
  }
);

export const updateContactNote = createAsyncThunk(
  'contactNotes/updateContactNote',
  async ({ noteId, data }: { noteId: string; data: UpdateContactNoteDTO }) => {
    return await contactsApiClient.updateNote(noteId, data);
  }
);

export const deleteContactNote = createAsyncThunk(
  'contactNotes/deleteContactNote',
  async (noteId: string) => {
    await contactsApiClient.deleteNote(noteId);
    return noteId;
  }
);

const contactNotesSlice = createSlice({
  name: 'contactNotes',
  initialState,
  reducers: {
    clearNotes: (state) => {
      state.contactNotes = [];
      state.notesLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContactNotes.pending, (state) => {
        state.notesLoading = true;
        state.error = null;
      })
      .addCase(fetchContactNotes.fulfilled, (state, action) => {
        state.notesLoading = false;
        state.contactNotes = action.payload;
      })
      .addCase(fetchContactNotes.rejected, (state, action) => {
        state.notesLoading = false;
        state.error = action.error.message || 'Failed to fetch notes';
      })
      .addCase(createContactNote.fulfilled, (state, action) => {
        state.contactNotes.unshift(action.payload);
      })
      .addCase(updateContactNote.fulfilled, (state, action) => {
        const index = state.contactNotes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.contactNotes[index] = action.payload;
        }
      })
      .addCase(deleteContactNote.fulfilled, (state, action) => {
        state.contactNotes = state.contactNotes.filter((n) => n.id !== action.payload);
      });
  },
});

export const { clearNotes } = contactNotesSlice.actions;
export default contactNotesSlice.reducer;
