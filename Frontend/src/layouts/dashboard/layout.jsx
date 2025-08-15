// DREAM sidebar ICONS
import {useEffect,useState, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { iconButtonClasses } from '@mui/material/IconButton';

import { useBoolean } from 'src/hooks/use-boolean';

import { allLangs } from 'src/locales';
import { varAlpha, stylesMode } from 'src/theme/styles';

import { bulletColor } from 'src/components/nav-section';
import { useSettingsContext } from 'src/components/settings';

import { Main } from './main';
import { NavMobile } from './nav-mobile';
import { layoutClasses } from '../classes';
import { NavVertical } from './nav-vertical';
import { NavHorizontal } from './nav-horizontal';
import { _account } from '../config-nav-account';
import { HeaderBase } from '../core/header-base';
import { _workspaces } from '../config-nav-workspace';
import { LayoutSection } from '../core/layout-section';
import { useSelector } from 'react-redux';
// import { navData, navDataUser } from '../config-nav-dashboard';
import { endpoints } from 'src/utils/axios';
import Storage from 'src/utils/local-store';
import postService from 'src/utils/httpService';
import { paths } from 'src/routes/paths';
import { CONFIG } from 'src/config-global';
import { SvgColor } from 'src/components/svg-color';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import AdjustIcon from '@mui/icons-material/Adjust';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import {  Settings,Lan,AccountTree,Analytics,DatasetLinked,SettingsInputComponent, Gavel, Calculate, Construction, PieChart } from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home';
import PaymentsIcon from '@mui/icons-material/Payments';
// import { Settings } from 'src/sections/settings/view';

const icon = (name) => <SvgColor src={`${CONFIG.site.basePath}/assets/icons/navbar/${name}.svg`} />;
const ICONS = {
  dashboard: icon('ic-dashboard'),
  employees: icon('ic-user'),
  companies: icon('ic-menu-item'),
  data: icon('ic-course'),
  plans: icon('ic-blog'),
  // settings: icon('ic-sun'),
  settings: icon('ic-lock'),
};

// sidebar nav dream

export function DashboardLayout({ sx, children, data }) {
  const theme = useTheme();
  const { role } = useSelector((state) => state.auth);
  const mobileNavOpen = useBoolean();

  const settings = useSettingsContext();

  const navColorVars = useNavColorVars(theme, settings);

  const layoutQuery = 'lg';

  const isNavMini = settings.navLayout === 'mini';

  const isNavHorizontal = settings.navLayout === 'horizontal';

  const isNavVertical = isNavMini || settings.navLayout === 'vertical';
  const userData = Storage.getJson("userData");
  const [navData,setNavData]=useState([]);
   useEffect(() => {
    getRolePermissions();

   },[])

   const getRolePermissions = () => {
           try {
            const payload={
              role_id:userData.role
            }
               postService(endpoints.auth.getRolePermissions, 'POST',payload).then((res) => {
                   if (res.data.length > 0) { // Fixed typo: 'lengt' -> 'length'
                    const transformedNavData = transformToNavData(res.data);
                    setNavData(transformedNavData);
                    Storage.store("role_Permissions", res.data);
                      //  setMasterPage(res.data);
                   } else {
                       console.log('No data found.');
                   }
               }).catch((error) => {
                   console.error('Error while fetching master pages:', error);
               });

               // setLoading(false);
           }
           catch (error) {
               console.error("Error while adding cluster:", error.response.data.message);
               // setLoading(false);
           }

       }

      const transformToNavData = (nav) => [
        {
          subheader: "",
          items: nav
            .filter((item) => item.permissions?.view) // Filter only items with view: true
            .map((item) =>
              item.submenu && item.submenu.length > 0
                ? {
                    title: item.text,
                    path: paths[item.slug]?.root || `/${item.slug}`,
                    icon: item.text==='Data' ? <DataUsageIcon/>:<Settings/> || ICONS.default,
                    children: item.submenu
                      .filter((subItem) => subItem.permissions?.view) // Filter submenu items with view: true
                      .map((subItem) => ({
                        title: subItem.text,
                        path: paths[subItem.slug]?.root || `/${subItem.slug}`,
                      })),
                  }
                : {
                    title: item.text,
                    path: paths[item.slug]?.root || `/${item.slug}`,
                    icon:
                      item.text === "Home"
                        ? <HomeIcon/>
                        : item.text === "Templates"
                        ? ICONS.plans
                        : item.text === "Workflows"
                        ? <Lan/>
                        : item.text === "Analytics"
                        ? <Analytics/>
                        : item.text === "Disputes"
                        ? <Gavel/>
                        : item.text === "Quotas"
                        ? <PieChart/>
                        : item.text==='Data' ? <DataUsageIcon/>:
                         item.text==='Set Up'?<Construction/>:
                         item.text==='Payments'?<PaymentsIcon/>:item.text==='Adjustments'?<Calculate/>:item.text === "Settings" ? ICONS.plans:item.text === "Data Sources" ?

                        <DatasetLinked/> :  ICONS.dashboard,
                  }
            ),
        },
      ];

// top navbar dream
  return (
    <>
      <NavMobile
        // data={role === 'ADMIN' ? navData : navDataUser}
        data={navData }
        open={mobileNavOpen.value}
        onClose={mobileNavOpen.onFalse}
        cssVars={navColorVars.section}
      />

      <LayoutSection
        /** **************************************
         * Header
         *************************************** */
        headerSection={
          <HeaderBase
            layoutQuery={layoutQuery}
            disableElevation={isNavVertical}
            onOpenNav={mobileNavOpen.onTrue}
            data={{
              // nav: role === 'ADMIN' ? navData : navDataUser,
              nav: navData,
              // account: _account,
              workspaces: _workspaces,
            }}
            slotsDisplay={{
              signIn: false,
              purchase: false,
              helpLink: false,
            }}
            slots={{
              topArea: (
                <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                  This is an info Alert.
                </Alert>
              ),
              bottomArea: isNavHorizontal ? (
                <NavHorizontal
                  // data={role === 'ADMIN' ? navData : navDataUser}
                  data={ navData}
                  layoutQuery={layoutQuery}
                  cssVars={navColorVars.section}
                />
              ) : null,
            }}
            slotProps={{
              toolbar: {
                sx: {
                  [`& [data-slot="logo"]`]: {
                    display: 'none',
                  },
                  [`& [data-area="right"]`]: {
                    gap: { xs: 0, sm: 0.75 },
                  },
                  ...(isNavHorizontal && {
                    bgcolor: 'var(--layout-nav-bg)',
                    [`& .${iconButtonClasses.root}`]: {
                      color: 'var(--layout-nav-text-secondary-color)',
                    },
                    [theme.breakpoints.up(layoutQuery)]: {
                      height: 'var(--layout-nav-horizontal-height)',
                    },
                    [`& [data-slot="workspaces"]`]: {
                      color: 'var(--layout-nav-text-primary-color)',
                    },
                    [`& [data-slot="logo"]`]: {
                      display: 'none',
                      [theme.breakpoints.up(layoutQuery)]: {
                        display: 'inline-flex',
                      },
                    },
                    [`& [data-slot="divider"]`]: {
                      [theme.breakpoints.up(layoutQuery)]: {
                        display: 'flex',
                      },
                    },
                  }),
                },
              },
              container: {
                maxWidth: false,
                sx: {
                  ...(isNavVertical && { px: { [layoutQuery]: 5 } }),
                },
              },
            }}
          />
        }
        /** **************************************
         * Sidebar
         *************************************** */
        sidebarSection={
          isNavHorizontal ? null : (
            <NavVertical className="custome-nav"
              // data={role === 'ADMIN' ? navData : navDataUser}
              data={ navData }
              isNavMini={isNavMini}
              layoutQuery={layoutQuery}
              cssVars={navColorVars.section}
              onToggleNav={() =>
                settings.onUpdateField(
                  'navLayout',
                  settings.navLayout === 'vertical' ? 'mini' : 'vertical'
                )
              }
            />
          )
        }
        /** **************************************
         * Footer
         *************************************** */
        footerSection={null}
        /** **************************************
         * Style
         *************************************** */
        cssVars={{
          ...navColorVars.layout,
          '--layout-transition-easing': 'linear',
          '--layout-transition-duration': '120ms',
          '--layout-nav-mini-width': '88px',
          '--layout-nav-vertical-width': '300px',
          '--layout-nav-horizontal-height': '64px',
          '--layout-dashboard-content-pt': theme.spacing(1),
          '--layout-dashboard-content-pb': theme.spacing(8),
          '--layout-dashboard-content-px': theme.spacing(5),
        }}
        sx={{
          [`& .${layoutClasses.hasSidebar}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
              pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
            },
          },
          ...sx,
        }}
      >
        <Main isNavHorizontal={isNavHorizontal}>{children}</Main>
      </LayoutSection>
    </>
  );
}

// ----------------------------------------------------------------------

function useNavColorVars(theme, settings) {
  const {
    vars: { palette },
  } = theme;

  return useMemo(() => {
    switch (settings.navColor) {
      case 'integrate':
        return {
          layout: {
            '--layout-nav-bg': palette.background.default,
            '--layout-nav-horizontal-bg': varAlpha(palette.background.defaultChannel, 0.8),
            '--layout-nav-border-color': varAlpha(palette.grey['500Channel'], 0.12),
            '--layout-nav-text-primary-color': palette.text.primary,
            '--layout-nav-text-secondary-color': palette.text.secondary,
            '--layout-nav-text-disabled-color': palette.text.disabled,
            [stylesMode.dark]: {
              '--layout-nav-border-color': varAlpha(palette.grey['500Channel'], 0.08),
              '--layout-nav-horizontal-bg': varAlpha(palette.background.defaultChannel, 0.96),
            },
          },
          section: {},
        };
      case 'apparent':
        return {
          layout: {
            '--layout-nav-bg': palette.grey[900],
            '--layout-nav-horizontal-bg': varAlpha(palette.grey['900Channel'], 0.96),
            '--layout-nav-border-color': 'transparent',
            '--layout-nav-text-primary-color': palette.common.white,
            '--layout-nav-text-secondary-color': palette.grey[500],
            '--layout-nav-text-disabled-color': palette.grey[600],
            [stylesMode.dark]: {
              '--layout-nav-bg': palette.grey[800],
              '--layout-nav-horizontal-bg': varAlpha(palette.grey['800Channel'], 0.8),
            },
          },
          section: {
            // caption
            '--nav-item-caption-color': palette.grey[600],
            // subheader
            '--nav-subheader-color': palette.grey[600],
            '--nav-subheader-hover-color': palette.common.white,
            // item
            '--nav-item-color': palette.grey[500],
            '--nav-item-root-active-color': palette.primary.light,
            '--nav-item-root-open-color': palette.common.white,
            // bullet
            '--nav-bullet-light-color': bulletColor.dark,
            // sub
            ...(settings.navLayout === 'vertical' && {
              '--nav-item-sub-active-color': palette.common.white,
              '--nav-item-sub-open-color': palette.common.white,
            }),
          },
        };
      default:
        throw new Error(`Invalid color: ${settings.navColor}`);
    }
  }, [
    palette.background.default,
    palette.background.defaultChannel,
    palette.common.white,
    palette.grey,
    palette.primary.light,
    palette.text.disabled,
    palette.text.primary,
    palette.text.secondary,
    settings.navColor,
    settings.navLayout,
  ]);
}
