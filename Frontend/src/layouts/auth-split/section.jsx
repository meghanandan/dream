import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';
import { varAlpha, bgGradient } from 'src/theme/styles';

// ----------------------------------------------------------------------

export function Section({
  sx,
  method,
  layoutQuery,
  methods,
  title = 'Manage the job',
  imgUrl = '',
  subtitle = 'More effectively with optimized workflows.',
  ...other
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        ...bgGradient({
          color: `0deg, ${varAlpha(
            theme.vars.palette.background.defaultChannel,
            0
          )}, ${varAlpha(theme.vars.palette.background.defaultChannel, 0)}`,
          imgUrl: `${CONFIG.site.basePath}/assets/illustrations/login-page.jpg`,
        }),
        px: 10,
        pb: 3,
        width: 1,
        maxWidth: '50%',
        display: 'none',
        position: 'relative',
        pt: 'var(--layout-header-desktop-height)',
        [theme.breakpoints.up(layoutQuery)]: {
          gap: 2,
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
        },
        ...sx,
      }}
      {...other}
    >
      <div>
        <Typography variant="h2" sx={{ textAlign: 'center', color:'#FFF' }}>
          {title}
        </Typography>

        {subtitle && (
          <Typography variant="h4"  sx={{ color: 'text.secondary', textAlign: 'center', mt: 4}}>
            {subtitle}
          </Typography>
        )}
      </div>     
    </Box>
  );
}
