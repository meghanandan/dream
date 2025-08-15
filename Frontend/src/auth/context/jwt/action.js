import { deleteCookie } from 'src/utils/cookie';
import axios, { endpoints } from 'src/utils/axios';

import { setSession } from './utils';
import { STORAGE_KEY } from './constant';

/** **************************************
 * Sign in
 *************************************** */
export const signInWithPassword = async ({ email, password }) => {
  try {
    const params = { email, password };

    const res = await axios.post(endpoints.auth.signIn, params);
    
    const { accessToken } = res.data;

    if (!accessToken) {
      throw new Error('Please check your email and password');
    }

    setSession(accessToken);
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
};

/** **************************************
 * Sign up
 *************************************** */
export const signUp = async ({ email, password, firstName, lastName }) => {
  const params = {
    email,
    password,
    firstName,
    lastName,
  };

  try {
    const res = await axios.post(endpoints.auth.signUp, params);

    const { accessToken } = res.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    sessionStorage.setItem(STORAGE_KEY, accessToken);
  } catch (error) {
    console.error('Error during sign up:', error);
    throw error;
  }
};

// *******************
// Password
// *****************
export const passwordCreate = async ({ email, password }) => {
  const params = {
    email,
    password,
  };

  try {
    const res = await axios.post(endpoints.auth.password, params);

    const { accessToken } = res.data;
   
  } catch (error) {
    console.error('Error during sign up:', error);
    throw error;
  }
};
/** **************************************
 * Sign out
 *************************************** */
export const signOut = async () => {
  try {
    await setSession(null);
    deleteCookie('access-token');
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};

/** **************************************
 * Sign in With Google
 *************************************** */
export const signInWithGoogleRedirect = async () => {
  try {
    const res = await axios.get(endpoints.auth.google.redirect);
    return res.data.url;
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
};
