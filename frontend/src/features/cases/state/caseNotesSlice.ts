import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { casesApiClient } from '../api/casesApiClient';
import type {
  CaseNote,
  CreateCaseNoteDTO,
} from '../../../types/case';
import type { OutcomeDefinition } from '../../../types/outcomes';
import type {
  InteractionOutcomeImpact,
  UpdateInteractionOutcomesInput,
} from '../../../types/outcomes';

export interface CaseNotesState {
  notes: CaseNote[];
  outcomeDefinitions: OutcomeDefinition[];
  interactionOutcomeImpacts: Record<string, InteractionOutcomeImpact[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: CaseNotesState = {
  notes: [],
  outcomeDefinitions: [],
  interactionOutcomeImpacts: {},
  loading: false,
  saving: false,
  error: null,
};

export const fetchCaseNotes = createAsyncThunk(
  'caseNotes/fetchCaseNotes',
  async (caseId: string) => {
    const result = await casesApiClient.listCaseNotes(caseId);
    return result.notes;
  }
);

export const createCaseNote = createAsyncThunk(
  'caseNotes/createCaseNote',
  async (data: CreateCaseNoteDTO) => {
    return await casesApiClient.createCaseNote(data);
  }
);

export const fetchCaseOutcomeDefinitions = createAsyncThunk(
  'caseNotes/fetchOutcomeDefinitions',
  async (includeInactive: boolean = false) => {
    return await casesApiClient.listOutcomeDefinitions(includeInactive);
  }
);

export const fetchInteractionOutcomes = createAsyncThunk(
  'caseNotes/fetchInteractionOutcomes',
  async ({ caseId, interactionId }: { caseId: string; interactionId: string }) => {
    const impacts = await casesApiClient.getInteractionOutcomes(caseId, interactionId);
    return { interactionId, impacts };
  }
);

export const saveInteractionOutcomes = createAsyncThunk(
  'caseNotes/saveInteractionOutcomes',
  async ({ caseId, interactionId, data }: { caseId: string; interactionId: string; data: UpdateInteractionOutcomesInput }) => {
    const impacts = await casesApiClient.updateInteractionOutcomes(caseId, interactionId, data);
    return { interactionId, impacts };
  }
);

const caseNotesSlice = createSlice({
  name: 'caseNotes',
  initialState,
  reducers: {
    clearNotes: (state) => {
      state.notes = [];
      state.interactionOutcomeImpacts = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCaseNotes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCaseNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = action.payload;
        action.payload.forEach((note) => {
          state.interactionOutcomeImpacts[note.id] = note.outcome_impacts || [];
        });
      })
      .addCase(createCaseNote.fulfilled, (state, action) => {
        state.notes.unshift(action.payload);
      })
      .addCase(fetchCaseOutcomeDefinitions.fulfilled, (state, action) => {
        state.outcomeDefinitions = action.payload;
      })
      .addCase(fetchInteractionOutcomes.fulfilled, (state, action) => {
        state.interactionOutcomeImpacts[action.payload.interactionId] = action.payload.impacts;
      })
      .addCase(saveInteractionOutcomes.fulfilled, (state, action) => {
        state.interactionOutcomeImpacts[action.payload.interactionId] = action.payload.impacts;
        const noteIndex = state.notes.findIndex(n => n.id === action.payload.interactionId);
        if (noteIndex !== -1) {
          state.notes[noteIndex].outcome_impacts = action.payload.impacts;
        }
      });
  },
});

export const { clearNotes } = caseNotesSlice.actions;
export default caseNotesSlice.reducer;
