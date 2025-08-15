import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { LoadingScreen } from 'src/components/loading-screen';
import { AuthGuard } from 'src/auth/guard';
import { CreateTemplates } from 'src/sections/templates/view/create-view';
import { CreateWorkflow } from 'src/sections/workflows/view/create';
import { CreateRoleView } from 'src/sections/role/view/create-view';
import {CreateUserView} from 'src/sections/users/view/create-view';
import { element } from 'prop-types';
import CustomerOnBoard from 'src/pages/customeronboard';
import {QuotasCRUDGrid} from 'src/sections/quotas/list-view';
import AuditTableDemo from 'src/sections/quotas/AuditTableDemo';
import {SetupQuotaTemplateFields} from 'src/sections/setup/view/SetupQuotaTemplateFields';

// Overview
const LoginPage = lazy(() => import('src/pages/userAuth/index'));
const HomePage = lazy(() => import('src/pages/home/index'));
const TemplatesPage = lazy(() => import('src/pages/templates'));
const WorkflowsPage = lazy(() => import('src/pages/workflows'));
const AnalyticsPage = lazy(() => import('src/pages/analytics'));
const SettingPage = lazy(() => import('src/pages/settings'));
const UsersPage = lazy(() => import('src/pages/users'));
const RolePage = lazy(() => import('src/pages/role'));
const CustomFields =lazy(()=>import('src/pages/custom-fields'))
const APIConfig =lazy(()=>import('src/pages/configuration'))
const DataSource = lazy(()=>import('src/pages/data-sources'))
const Page =lazy(()=>import('src/pages/data'));
const Disputes=lazy(()=>import('src/pages/dispute'));
const Adjustment=lazy(()=>import('src/pages/adjustment'));
const DataSetUp=lazy(()=>import('src/pages/setup'));
const Payment=lazy(()=>import('src/pages/payments'));

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

export const dashboardRoutes = [

  {
    path: 'user',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <LoginPage />, index: true },
    ],
  },
  {
    path: 'home',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <HomePage />, index: true },
    ],
  },
  {
    path: 'template',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <TemplatesPage />, index: true },
      { path: 'create', element: <CreateTemplates/> },
      { path: ':id/edit', element: <CreateTemplates /> },
    ],
  },
  {
    path: 'workflows',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <WorkflowsPage />, index: true },
      { path: 'create', element: <CreateWorkflow/> },
      { path: ':id/edit', element: <CreateWorkflow /> },
      { path: ':id/details', element: <CreateWorkflow /> },
    ],
  },
  {
    path: 'analytics',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <AnalyticsPage />, index: true },
    ],
  },
  {
    path: 'settings',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <SettingPage />, index: true },
      {
        path: 'group',
        children: [
      {path:'users',element:<UsersPage/>},
      {path:'role',element:<UsersPage/>}
    ],
  }
    ],
  },
  {
    path: 'users',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <UsersPage />, index: true },
      { path: 'create', element: <CreateUserView/> },
        { path: ':id/edit', element: <CreateUserView /> },
        { path: ':id/details', element: <CreateUserView /> },

    ],
  },
  {
    path: 'role',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <RolePage />, index: true },
        { path: 'create', element: <CreateRoleView/> },
        { path: ':id/edit', element: <CreateRoleView /> },
        { path: ':id/details', element: <CreateRoleView /> },
    ],
  },
  {
    path: 'quotas',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <QuotasCRUDGrid />, index: true },
        { path: 'audit-trail', element: <AuditTableDemo /> },
        { path: 'set-up', element: <SetupQuotaTemplateFields /> },
    ],
  },
  {
    path: 'custom-fields',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <CustomFields />, index: true },
        { path: 'create', element: <CreateRoleView/> },
        { path: ':id/edit', element: <CreateRoleView /> },
        { path: ':id/details', element: <CreateRoleView /> },
    ],
  },
  {
    path: 'configuration',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <APIConfig />, index: true },
    ],
  },

  {
    path: 'data_sources',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <DataSource />, index: true },
    ],
  },
  {
    path: 'orders',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <Page />, index: true },
    ],
  },
  {
    path: 'adjustment',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <Adjustment />, index: true },
    ],
  },
  {
    path: 'customeronboard',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <CustomerOnBoard />, index: true },
    ],
  },
  {
    path: 'disputes',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <Disputes />, index: true },
    ],
  },
  {
    path: 'set-up',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <DataSetUp />, index: true },
    ],
  },
  {
    path: 'payments',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
        { element: <Payment />, index: true },
    ],
  },
  { path: '500', element: <Page500 /> },
  { path: '404', element: <Page404 /> },
  { path: '403', element: <Page403 /> },
];
