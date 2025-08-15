import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios, { endpoints } from 'src/utils/axios';
import { setSession, isValidToken } from 'src/utils/jwt';
import { STORAGE_KEY } from 'src/utils/constant';
import { getCookie, deleteCookie } from 'src/utils/cookie';
import { useNavigate } from 'react-router-dom';
import Storage from 'src/utils/local-store';

const initialState = {
  user: null,
  role: null,
  loading: false,
  authenticated: false,
  error: null,
};

// Async action to check user session
export const checkUserSession = createAsyncThunk(
  'auth/checkSession',
  async (_, { rejectWithValue }) => {
    try {
      let accessToken = Storage.get('token');

      // REMOVE QUOTES IF PRESENT
      if (accessToken && accessToken.startsWith('"') && accessToken.endsWith('"')) {
        accessToken = accessToken.slice(1, -1);
      }

      if (accessToken && isValidToken(accessToken)) {
        setSession(accessToken);
        const { data } = await axios.get(endpoints.auth.me, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return { user: data, token: accessToken, authenticated: true };
      }

      return rejectWithValue('No valid session found');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async action to login
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, licence_type }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endpoints.auth.signIn, { email, password, licence_type });
      if (data.error) {
        return rejectWithValue(data.error);
      }
      if (data.message === 'User not found') {
        return rejectWithValue('User not found');
      }
      const { accessToken, userdata, role, licencePROList, trialInfo } = data;
      Storage.store('token', accessToken);
      Storage.store('userData', userdata);
      Storage.store('licencePROList', licencePROList);
      // Prefer top-level trialInfo, else nested inside userdata
      Storage.store('trialInfo', trialInfo || userdata?.trialInfo || null); // Store trial information from login
      setSession(accessToken);
      return { user: userdata, role: role || userdata?.role, token: accessToken };
    } catch (error) {
      console.log('Login error:', error);
      
      // Handle trial expired responses (403 status)
      if (error?.response?.status === 403 && error?.response?.data?.code === 'TRIAL_EXPIRED') {
        console.log('Trial expired error detected in authSlice');
        return rejectWithValue({
          code: 'TRIAL_EXPIRED',
          message: error.response.data.message,
          organizationName: error.response.data.organizationName,
          supportEmail: error.response.data.supportEmail,
          trialEndDate: error.response.data.trialEndDate
        });
      }
      
      // Return other error objects from the backend
      if (error?.response?.data) {
        console.log('Server error response:', error.response.data);
        return rejectWithValue(error.response.data);
      }
      
      // Fallback error message
      return rejectWithValue({
        message: error?.message || 'Login failed',
        code: error?.code || 'ERROR'
      });
    }
  }
);

// Async action to logout
export const logout = createAsyncThunk('auth/logout', async () => {
  const navigate = useNavigate();
  window.localStorage.clear();
  setSession(null);
  deleteCookie('access-token');
  navigate('/auth/sign-in');
  if (Storage?.clearAll) Storage.clearAll();

  // Remove specific storage keys if necessary
  if (Storage?.remove) Storage.remove();
  
  // Explicitly clear trial info
  localStorage.removeItem('trialInfo');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(checkUserSession.pending, (state) => {
        state.loading = true;
        state.authenticated = false;
      })
      .addCase(checkUserSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.authenticated = true;
        state.loading = false;
      })
      .addCase(checkUserSession.rejected, (state, action) => {
        state.error = action.payload;
        state.authenticated = false;
        state.loading = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.authenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload;
        state.authenticated = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.role = null;
        state.authenticated = false;
      });
  },
});

export default authSlice.reducer;
