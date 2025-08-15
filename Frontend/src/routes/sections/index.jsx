import { Navigate, useRoutes } from 'react-router-dom';
import { authRoutes } from './auth';
import { dashboardRoutes } from './dashboard';
import { userRoutes } from './user';
import { useEffect } from 'react';
import { checkUserSession } from 'src/store/authSlice';
import { useSelector, useDispatch } from 'react-redux';

export function Router() {
  const { role } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkUserSession()); // Dispatch session check on mount
  }, [dispatch]);

  return useRoutes([
    {
      path: '/',
      element: <Navigate to="/home" replace />,
    },
    // Auth Routes
    ...authRoutes,
    // Dashboard Routes for Admin
    // ...(role === 'ADMIN' ? dashboardRoutes : userRoutes),
    ...(dashboardRoutes),
    // Catch-all route for 404
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}

export default Router;
