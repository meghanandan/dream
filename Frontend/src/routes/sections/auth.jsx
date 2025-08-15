import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthSplitLayout } from 'src/layouts/auth-split';
import { SplashScreen } from 'src/components/loading-screen';
import { GuestGuard } from 'src/auth/guard';

/** **************************************
 * Jwt
 *************************************** */
const Jwt = {
  SignInPage: lazy(() => import('src/pages/auth/jwt/sign-in')),
  SignUpPage: lazy(() => import('src/pages/auth/jwt/sign-up')),
  Newpassword: lazy(() => import('src/pages/auth/jwt/password')),
};

const authJwt = {
  path: '',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Jwt.SignInPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'sign-up',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Jwt.SignUpPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'password',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Jwt.Newpassword />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
  ],
};

export const authRoutes = [
  {
    path: 'auth',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    children: [authJwt],
  },
];
