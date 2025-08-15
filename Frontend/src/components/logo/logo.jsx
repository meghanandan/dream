import { forwardRef } from 'react';

import Box from '@mui/material/Box';
import NoSsr from '@mui/material/NoSsr';
import { useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { logoClasses } from './classes';

import LogoIcon from 'src/assets/logo/dream-logo.png';

export const Logo = forwardRef(
  (
    {
      width = 120,
      height = 40,
      disableLink = false,
      className,
      href = '/',
      sx,
      ...other
    },
    ref
  ) => {
    const logo = (
      <img
        src={LogoIcon}
        alt="DREAM Logo"
        style={{
          width,
          height,
          display: 'block',
          objectFit: 'contain',
        }}
      />
    );

    return (
      <NoSsr
        fallback={
          <Box
            width={width}
            height={height}
            className={logoClasses.root.concat(className ? ` ${className}` : '')}
            sx={{
              flexShrink: 0,
              display: 'inline-flex',
              verticalAlign: 'middle',
              ...sx,
            }}
          />
        }
      >
        <Box
          ref={ref}
          component={RouterLink}
          href={href}
          width={width}
          height={height}
          className={logoClasses.root.concat(className ? ` ${className}` : '')}
          aria-label="logo"
          sx={{
            flexShrink: 0,
            display: 'inline-flex',
            verticalAlign: 'middle',
            textDecoration: "none",
            color: "#000",
            ...(disableLink && { pointerEvents: 'none' }),
            ...sx,
          }}
          {...other}
        >
          {logo}
        </Box>
      </NoSsr>
    );
  }
);
