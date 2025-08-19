import { Typography, Box, Chip } from '@mui/material';
import { getVersionInfo, getVersionString, getBuildInfo } from '../utils/version';

// Version display component
export function VersionDisplay({ variant = 'full', color = 'text.secondary', position = 'bottom-right' }) {
  const versionInfo = getVersionInfo();
  
  const positionStyles = {
    'bottom-right': {
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 1000,
    },
    'bottom-left': {
      position: 'fixed',
      bottom: 16,
      left: 16,
      zIndex: 1000,
    },
    'bottom-center': {
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
    },
    'inline': {
      display: 'inline-block',
    }
  };

  if (variant === 'chip') {
    return (
      <Box sx={positionStyles[position]}>
        <Chip 
          label={getVersionString()} 
          size="small" 
          variant="outlined"
          sx={{ 
            opacity: 0.7,
            '&:hover': { opacity: 1 }
          }}
        />
      </Box>
    );
  }

  if (variant === 'minimal') {
    return (
      <Box sx={positionStyles[position]}>
        <Typography 
          variant="caption" 
          color={color}
          sx={{ 
            opacity: 0.6,
            fontSize: '0.7rem',
            '&:hover': { opacity: 1 }
          }}
        >
          {getVersionString()}
        </Typography>
      </Box>
    );
  }

  // Full version display (default)
  return (
    <Box sx={positionStyles[position]}>
      <Typography 
        variant="caption" 
        color={color}
        component="div"
        sx={{ 
          opacity: 0.6,
          fontSize: '0.7rem',
          textAlign: position.includes('center') ? 'center' : 'left',
          '&:hover': { opacity: 1 }
        }}
      >
        <div>{versionInfo.name}</div>
        <div>{getVersionString()}</div>
        <div>{getBuildInfo()}</div>
      </Typography>
    </Box>
  );
}

// Simple version text component for embedding in other components
export function VersionText({ showBuild = false }) {
  if (showBuild) {
    return (
      <Typography variant="caption" color="text.secondary">
        {getVersionString()} • {getBuildInfo()}
      </Typography>
    );
  }
  
  return (
    <Typography variant="caption" color="text.secondary">
      {getVersionString()}
    </Typography>
  );
}

export default VersionDisplay;
