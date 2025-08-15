import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios, { endpoints } from 'src/utils/axios';

const initialState = {
    apiSetting: null,
    loading: false,
    error: null,
};

// Async action to fetch API settings
export const fetchApiSetting = createAsyncThunk(
    'settingApi/fetch',
    async (_, { rejectWithValue }) => {
        try {
            const {data} = await axios.get(endpoints.settings_api.getAll);
            return data.data;
        } catch (err) {
            return rejectWithValue('Failed to fetch API settings');
        }
    }
);

// Async action to update API settings
export const updateApiSetting = createAsyncThunk(
    'settingApi/update',
    async (updatedSetting, { rejectWithValue }) => {
        try {
            const response = await axios.put(endpoints.settings_api.update, updatedSetting);
            return response.data;
        } catch (err) {
            return rejectWithValue('Failed to update API settings');
        }
    }
);

const settingApiSlice = createSlice({
    name: 'settingApi',
    initialState,
    extraReducers: (builder) => {
        builder
            .addCase(fetchApiSetting.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchApiSetting.fulfilled, (state, action) => {
                state.loading = false;
                state.apiSetting = action.payload;
            })
            .addCase(fetchApiSetting.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateApiSetting.pending, (state) => {
                state.loading = true;
            })
            .addCase(updateApiSetting.fulfilled, (state, action) => {
                state.loading = false;
                state.apiSetting = action.payload;
            })
            .addCase(updateApiSetting.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export default settingApiSlice.reducer;
