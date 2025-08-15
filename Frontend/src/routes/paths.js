import { _id, _postTitles } from 'src/_mock/assets';

const ROOTS = {
  AUTH: '/auth',
  AUTH_DEMO: '/auth-demo',
  DASHBOARD: '/home',
};

export const paths = {
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  home: {
    root: `/home`,
    list: `/home/list`,
    details: (id) => `/home/${id}`,
    edit: (id) => `/home/${id}/edit`,
  },
  data: {
    root: `/data`,
    list: `/data/list`,
    details: (id) => `/data/${id}`,
    edit: (id) => `/data/${id}/edit`,
  },
  template: {
    root: `/template`,
    list: `/template/list`,
    details: (id) => `/template/${id}`,
    edit: (id) => `/template/${id}/edit`,
    create: '/template/create',
  },
  workflows: {
    root: `/workflows`,
    list: `/workflows/list`,
    details: (id) => `/workflows/${id}/details`,
    edit: (id) => `/workflows/${id}/edit`,
    create: '/workflows/create',
    copy: (id) => `/workflows/${id}/copy`,
  },
  analytics: {
    root: `/analytics`,
    list: `/analytics/list`,
    details: (id) => `/analytics/${id}`,
    edit: (id) => `/analytics/${id}/edit`,
  },
  settings: '/settings',
  user: {
    root: `/user`,
    login: '/user/login',
  },
  users: {
    root: `/users`,
    list: '/users/list',
    create: '/users/create',
    details: (id) => `/users/${id}/details`,
    edit: (id) => `/users/${id}/edit`,
  },
  role: {
    root: `/role`,
    list: '/role/list',
    details: (id) => `/role/${id}/details`,
    edit: (id) => `/role/${id}/edit`,
  },
  quotas: {
    root: `/quotas`,
    list: '/quotas/list',
  },
  auth: {
    jwt: {
      signIn: `${ROOTS.AUTH}/sign-in`,
      signUp: `${ROOTS.AUTH}/sign-up`,
    },
  },
  dashboard: {
    root: ROOTS.DASHBOARD,
  },
};
