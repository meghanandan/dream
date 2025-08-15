import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios, { endpoints } from 'src/utils/axios';
import Storage from 'src/utils/local-store';

// Fetch all custom fields
export const fetchCustomFields = createAsyncThunk(
    'settings/fetchCustomFields',
    async (_, { rejectWithValue }) => {
        try {
            const userData = Storage.getJson("userData");
            const payload = {
                org_code: userData.organization,
                user_id: userData.user_id,
            };
            const response = await axios.post(endpoints.external_api.getFieldsMappingInfoList,payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to fetch custom fields');
        }
    }
);

// Create a new custom field
export const createCustomField = createAsyncThunk(
    'settings/createCustomField',
    async (newField, { rejectWithValue }) => {
        try {
            const response = await axios.post(endpoints.settings_custom_fields.create, newField);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to create custom field');
        }
    }
);

// Update an existing custom field
export const updateCustomField = createAsyncThunk(
    'settings/updateCustomField',
    async (updatedField, { rejectWithValue }) => {
        try {
            const { data } = await axios.put(`${endpoints.settings_custom_fields.update}/${updatedField?.id}`, updatedField);

            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to update custom field');
        }
    }
);

// Delete a custom field
export const deleteCustomField = createAsyncThunk(
    'settings/deleteCustomField',
    async (id, { rejectWithValue }) => {
        try {
            await axios.delete(`${endpoints.settings_custom_fields.delete}/${id}`);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to delete custom field');
        }
    }
);

// Initial state
const initialState = {
    fields: [],
    loading: false,
    error: null,
};

// Create slice
const settingCustomFieldSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch custom fields
            .addCase(fetchCustomFields.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCustomFields.fulfilled, (state, action) => {
                state.fields = action.payload;
                state.loading = false;
            })
            .addCase(fetchCustomFields.rejected, (state, action) => {
                state.error = action.payload;
                state.loading = false;
            })

            // Create custom field
            .addCase(createCustomField.pending, (state) => {
                state.loading = true;
            })
            .addCase(createCustomField.fulfilled, (state, action) => {
                state.fields.push(action.payload);
                state.loading = false;
            })
            .addCase(createCustomField.rejected, (state, action) => {
                state.error = action.payload;
                state.loading = false;
            })

            // Update custom field
            .addCase(updateCustomField.pending, (state) => {
                state.loading = true;
            })
            .addCase(updateCustomField.fulfilled, (state, action) => {
                const index = state.fields.findIndex((field) => field.id === action.payload.id);
                if (index !== -1) {
                    state.fields[index] = action.payload;
                }
                state.loading = false;
            })
            .addCase(updateCustomField.rejected, (state, action) => {
                state.error = action.payload;
                state.loading = false;
            })

            // Delete custom field
            .addCase(deleteCustomField.pending, (state) => {
                state.loading = true;
            })
            .addCase(deleteCustomField.fulfilled, (state, action) => {
                state.fields = state.fields.filter((field) => field.id !== action.payload);
                state.loading = false;
            })
            .addCase(deleteCustomField.rejected, (state, action) => {
                state.error = action.payload;
                state.loading = false;
            });
    },
});

// Export reducer
export default settingCustomFieldSlice.reducer;
