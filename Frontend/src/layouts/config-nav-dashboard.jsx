import { paths } from 'src/routes/paths';
import { CONFIG } from 'src/config-global';
import { SvgColor } from 'src/components/svg-color';
import React, { useEffect, useState } from 'react';


const icon = (name) => <SvgColor src={`${CONFIG.site.basePath}/assets/icons/navbar/${name}.svg`} />;
const ICONS = {
  dashboard: icon('ic-dashboard'),
  employees: icon('ic-user'),
  companies: icon('ic-menu-item'),
  data: icon('ic-course'),
  plans: icon('ic-blog'),
  settings: icon('ic-lock'),
};



export const navData = [
  {
    subheader: '',
    items: [
      { title: 'Home', path: paths.home.root, icon: ICONS.dashboard },
      { title: 'Template', path: paths.template.root, icon: ICONS.dashboard },
      { title: 'Workflows', path: paths.workflows.root, icon: ICONS.employees },
      { title: 'Analytics', path: paths.analytics.root, icon: ICONS.companies },
      { title: 'Settings', path: paths.settings, icon: ICONS.settings,
        children: [
          { title: 'Settings', path: paths.settings},
          { title: 'Role', path: paths.role.root},
          { title: 'Users', path: paths.users.root}
        ],
       },
      // { title: 'Role', path: paths.role.root, icon: ICONS.settings },
      // { title: 'Users', path: paths.users.root, icon: ICONS.employees },
    ],
  },
];

export const navDataUser = [
  {
    subheader: 'Overview',
    items: [
      { title: 'Home', path: paths.home.root, icon: ICONS.dashboard },
      { title: 'Data', path: paths.data.root, icon: ICONS.data },
    ],
  },
];
