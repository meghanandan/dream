import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios, { endpoints } from 'src/utils/axios';

const initialState = {
    templates: [],
    templateFields: [],
    loading: false,
    error: null,
    selectedTemplate: null, // Store a single template if needed
};

// Async Thunks for CRUD operations

// Fetch all templates
export const fetchTemplates = createAsyncThunk(
    'templates/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axios.get(endpoints.auth.getAll);
            // const { data } = await axios.get(endpoints.template.getAll);
            return data.data; // Assuming templates are in `data.data`
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to fetch templates');
        }
    }
);

// Fetch a specific template by ID
export const fetchTemplateById = createAsyncThunk(
    'templates/fetchById',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await axios.get(`${endpoints.template.getById}/${id}`);
            return data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to fetch template');
        }
    }
);

// Create a new template
export const createTemplate = createAsyncThunk(
    'templates/create',
    async (templateData, { rejectWithValue }) => {
        try {
            const { data } = await axios.post(endpoints.template.create, templateData);
            return data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to create template');
        }
    }
);

// Update an existing template by ID
export const updateTemplate = createAsyncThunk(
    'templates/update',
    async (templateData, { rejectWithValue }) => {
        try {
            const { data } = await axios.put(`${endpoints.template.update}/${templateData?.id}`, templateData);
            return data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to update template');
        }
    }
);

// Delete a template by ID
export const deleteTemplate = createAsyncThunk(
    'templates/delete',
    async (id, { rejectWithValue }) => {
        try {
            await axios.delete(`${endpoints.template.delete}/${id}`);
            return id; // Return the deleted template's ID to remove it from the state
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to delete template');
        }
    }
);

// Async action to fetch template fields
export const fetchTemplateFields = createAsyncThunk(
    'templates/fetchFields',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axios.get(endpoints.settings.getAll);
            return data.data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Template Slice
const templateSlice = createSlice({
    name: 'templates',
    initialState,
    reducers: {
        clearSelectedTemplate(state) {
            state.selectedTemplate = null; // Clear the selected template from the state
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch All Templates
            .addCase(fetchTemplates.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTemplates.fulfilled, (state, action) => {
                state.templates = action.payload;
                state.loading = false;
            })
            .addCase(fetchTemplates.rejected, (state, action) => {
                state.error = action.payload;
                state.loading = false;
            })

            // Fetch Template by ID
            .addCase(fetchTemplateById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTemplateById.fulfilled, (state, action) => {
                state.selectedTemplate = action.payload;
                state.loading = false;
            })
            .addCase(fetchTemplateById.rejected, (state, action) => {
                state.error = action.payload;
                state.loading = false;
            })

            // Create Template
            .addCase(createTemplate.fulfilled, (state, action) => {
                state.templates.push(action.payload);
            })
            .addCase(createTemplate.rejected, (state, action) => {
                state.error = action.payload;
            })

            // Update Template
            .addCase(updateTemplate.fulfilled, (state, action) => {
                const index = state.templates.findIndex((t) => t.id === action.payload.id);
                if (index !== -1) {
                    state.templates[index] = action.payload;
                }
            })
            .addCase(updateTemplate.rejected, (state, action) => {
                state.error = action.payload;
            })

            // Delete Template
            .addCase(deleteTemplate.fulfilled, (state, action) => {
                state.templates = state.templates.filter((t) => t.id !== action.payload);
            })
            .addCase(deleteTemplate.rejected, (state, action) => {
                state.error = action.payload;
            })

            // Fetch Template Fields
            .addCase(fetchTemplateFields.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTemplateFields.fulfilled, (state, action) => {
                state.templateFields = action.payload;
                state.loading = false;
            })
            .addCase(fetchTemplateFields.rejected, (state, action) => {
                state.error = action.payload;
                state.loading = false;
            });
    },
});

export const { clearSelectedTemplate } = templateSlice.actions;

export default templateSlice.reducer;
