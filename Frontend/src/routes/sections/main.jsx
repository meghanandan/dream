import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { MainLayout } from 'src/layouts/main';
import { SplashScreen } from 'src/components/loading-screen';

const LeadsPage = lazy(() => import('src/pages/leads'));
export const mainRoutes = [
  {
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    children: [
      {
        element: (
          <MainLayout>
            <Outlet />
          </MainLayout>
        ),
        children: [
          {
            path: 'leads',
            element: <LeadsPage />,
          },
        ],
      },
    ],
  },
];
