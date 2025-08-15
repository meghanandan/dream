import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkUserSession } from 'src/store/authSlice'; // Redux action
import { SplashScreen } from 'src/components/loading-screen';
import { paths } from 'src/routes/paths';
import { CONFIG } from 'src/config-global';
import { STORAGE_KEY } from 'src/utils/constant';
import { isValidToken } from 'src/utils/jwt';
import { getCookie } from 'src/utils/cookie';

export function AuthGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { authenticated, loading } = useSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = useCallback(async () => {
    if (loading) return; // Wait for loading to finish

    const accessToken = sessionStorage.getItem(STORAGE_KEY) || getCookie(STORAGE_KEY);
    if (accessToken && isValidToken(accessToken)) {
      setIsChecking(false); // Token is valid, allow access
    } else {
      console.log('here')
      if (!authenticated) {
        const { method } = CONFIG.auth;
        const signInPath = { jwt: paths.auth.jwt.signIn }[method];
        const returnTo = encodeURIComponent(location.pathname);
        navigate(`${signInPath}?returnTo=${returnTo}`, { replace: true });
        return;
      }
      setIsChecking(false);
    }
  }, [authenticated, loading, location.pathname, navigate]);

  useEffect(() => {
    dispatch(checkUserSession()); // Dispatch session check on mount
  }, [dispatch]);

  useEffect(() => {
    checkPermissions(); // Check permissions whenever state changes
  }, [checkPermissions]);

  if (isChecking) {
    return <SplashScreen />; // Show loading until check completes
  }

  return <>{children}</>;
}

export default AuthGuard;
