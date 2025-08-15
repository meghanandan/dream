import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import templateReducer from './templateSlice';
import settingCustomFieldSlice from './settingCustomFieldSlice';
import settingApiSlice from './settingApiSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    templates: templateReducer,
    settingCustomField: settingCustomFieldSlice,
    settingApi: settingApiSlice,
  },
});

export default store;
