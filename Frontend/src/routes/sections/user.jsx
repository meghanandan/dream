import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { LoadingScreen } from 'src/components/loading-screen';
import { AuthGuard } from 'src/auth/guard';

// Overview
const HomePage = lazy(() => import('src/pages/home/index'));
const DataPage = lazy(() => import('src/pages/data/index'));

// Error
const Page500 = lazy(() => import('src/pages/error/500'));
const Page403 = lazy(() => import('src/pages/error/403'));
const Page404 = lazy(() => import('src/pages/error/404'));

const layoutContent = (
    <DashboardLayout>
        <Suspense fallback={<LoadingScreen />}>
            <Outlet />
        </Suspense>
    </DashboardLayout>
);

export const userRoutes = [
    {
        path: 'home',
        element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
        children: [
            { element: <HomePage />, index: true },
        ],
    },
    {
        path: 'data',
        element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
        children: [
            { element: <DataPage />, index: true },
        ],
    },
    { path: '500', element: <Page500 /> },
    { path: '404', element: <Page404 /> },
    { path: '403', element: <Page403 /> },
];
