import Box from '@mui/material/Box';
import { styled, useTheme, alpha } from '@mui/material/styles';
import { Logo } from 'src/components/logo';
import { HeaderSection } from './header-section';
import { Searchbar } from '../components/searchbar';
import { MenuButton } from '../components/menu-button';
import { SignInButton } from '../components/sign-in-button';
import { SettingsButton } from '../components/settings-button';
import { LanguagePopover } from '../components/language-popover';
import { useState } from 'react';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { useTrialStatus } from 'src/hooks/use-trial-status';
import { 
  Typography, 
  Avatar, 
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Paper,
  useMediaQuery,
  Button,
  Stack,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

// Trial Version Indicator Component
function TrialVersionIndicator() {
  const theme = useTheme();
  const { trialData, loading, error, isTrialUser, daysRemaining, isExpired, isExpiringSoon, isPaidCustomer } = useTrialStatus();
  
  // Check if user is authenticated before showing trial info
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  
  // Don't show trial indicator if user is not authenticated
  if (!token || !userData) return null;

  // Show loading state
  if (loading) {
    return (
      <Paper
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        }}
      >
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Paper>
    );
  }

  // Don't show if there's an error or no trial data for non-trial users
  if (error || (!isTrialUser && !isPaidCustomer)) return null;

  // Show paid customer status (optional - you can remove this if you don't want to show anything for paid customers)
  if (isPaidCustomer && !isTrialUser) {
    return (
      <Tooltip 
        title={
          <Stack spacing={1} sx={{ p: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Paid Customer
            </Typography>
            <Typography variant="body2">
              You have full access to all features
            </Typography>
            {trialData?.trialConverted && (
              <Typography variant="caption" color="text.secondary">
                Converted from trial on {trialData.trialConvertedDate?.toLocaleDateString()}
              </Typography>
            )}
          </Stack>
        }
        arrow
        placement="bottom"
      >
        <Paper
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.success.main, 0.1),
            border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <CheckCircleIcon 
            sx={{ 
              fontSize: '1.2rem', 
              color: 'success.main',
            }} 
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 700,
                color: 'success.main',
                display: { xs: 'none', sm: 'inline' }
              }}
            >
              Paid License
            </Typography>

            {/* Mobile version - compact chip */}
            <Chip
              label="Pro"
              size="small"
              color="success"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.75rem',
                display: { xs: 'flex', sm: 'none' }
              }}
            />
          </Box>
        </Paper>
      </Tooltip>
    );
  }

  // Don't show if user is not on trial
  if (!isTrialUser) return null;

  const getTrialStatus = () => {
    if (isExpired) {
      return { color: 'error', urgency: 'high', icon: ErrorIcon, label: 'Expired' };
    }
    if (daysRemaining <= 3) {
      return { color: 'error', urgency: 'high', icon: WarningIcon, label: `${daysRemaining} days left` };
    }
    if (daysRemaining <= 7) {
      return { color: 'warning', urgency: 'medium', icon: WarningIcon, label: `${daysRemaining} days left` };
    }
    return { color: 'info', urgency: 'low', icon: AccessTimeIcon, label: `${daysRemaining} days left` };
  };

  const trialStatus = getTrialStatus();
  const StatusIcon = trialStatus.icon;

  return (
    <Tooltip 
      title={
        <Stack spacing={1} sx={{ p: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {isExpired ? 'Trial Expired' : 'Trial Version Active'}
          </Typography>
          <Typography variant="body2">
            {isExpired 
              ? 'Your trial has expired. Contact your administrator to upgrade.'
              : `${daysRemaining} days remaining in your free trial`
            }
          </Typography>
          {trialData?.trialEndDate && (
            <Typography variant="caption" color="text.secondary">
              {isExpired ? 'Expired' : 'Expires'} on: {trialData.trialEndDate.toLocaleDateString()}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {isExpired ? 'Contact administrator to upgrade' : ''}
          </Typography>
        </Stack>
      }
      arrow
      placement="bottom"
    >
      <Paper
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1,
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          bgcolor: alpha(theme.palette[trialStatus.color].main, 0.1),
          border: `2px solid ${alpha(theme.palette[trialStatus.color].main, 0.2)}`,
          backdropFilter: 'blur(8px)',
          animation: trialStatus.urgency === 'high' ? 'pulse 2s infinite' : 'none',
          '&:hover': {
            bgcolor: alpha(theme.palette[trialStatus.color].main, 0.15),
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[8],
            borderColor: alpha(theme.palette[trialStatus.color].main, 0.4),
          },
          '@keyframes pulse': {
            '0%': {
              boxShadow: `0 0 0 0 ${alpha(theme.palette[trialStatus.color].main, 0.4)}`,
            },
            '70%': {
              boxShadow: `0 0 0 10px ${alpha(theme.palette[trialStatus.color].main, 0)}`,
            },
            '100%': {
              boxShadow: `0 0 0 0 ${alpha(theme.palette[trialStatus.color].main, 0)}`,
            },
          },
        }}
        onClick={() => {
          // Handle upgrade click - you can navigate to pricing page or open upgrade modal
          console.log('Upgrade clicked - Trial status:', trialData);
          // You can add navigation or modal logic here
          // For example: router.push('/upgrade') or setUpgradeModalOpen(true)
        }}
      >
        {isExpired ? (
          <ErrorIcon 
            sx={{ 
              fontSize: '1.2rem', 
              color: `${trialStatus.color}.main`,
              animation: 'bounce 1s infinite',
              '@keyframes bounce': {
                '0%, 20%, 50%, 80%, 100%': {
                  transform: 'translateY(0)',
                },
                '40%': {
                  transform: 'translateY(-3px)',
                },
                '60%': {
                  transform: 'translateY(-2px)',
                },
              },
            }} 
          />
        ) : (
          <UpgradeIcon 
            sx={{ 
              fontSize: '1.2rem', 
              color: `${trialStatus.color}.main`,
              animation: trialStatus.urgency === 'high' ? 'bounce 1s infinite' : 'none',
              '@keyframes bounce': {
                '0%, 20%, 50%, 80%, 100%': {
                  transform: 'translateY(0)',
                },
                '40%': {
                  transform: 'translateY(-3px)',
                },
                '60%': {
                  transform: 'translateY(-2px)',
                },
              },
            }} 
          />
        )}
        
        {/* Single line layout for all content */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 700,
              color: `${trialStatus.color}.main`,
              display: { xs: 'none', sm: 'inline' }
            }}
          >
            {isExpired ? 'Trial Expired' : 'Trial Version'}
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 500,
              display: { xs: 'none', sm: 'inline' }
            }}
          >
            {isExpired ? '' : ` - ${trialStatus.label}`}
          </Typography>

          {/* Mobile version - compact chip */}
          <Chip
            label={isExpired ? 'Expired' : `Trial: ${daysRemaining}d left`}
            size="small"
            color={trialStatus.color}
            sx={{ 
              fontWeight: 600,
              fontSize: '0.75rem',
              display: { xs: 'flex', sm: 'none' }
            }}
          />
        </Box>

        <StatusIcon 
          sx={{ 
            fontSize: '1rem', 
            color: 'text.secondary',
            opacity: 0.7
          }} 
        />
      </Paper>
    </Tooltip>
  );
}

// User Profile Dropdown Component
function UserProfileDropdown() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const getUserDetails = () => {
    try {
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // If no token, don't show the profile
      if (!token) return null;
      
      return userData ? JSON.parse(userData) : {};
    } catch (error) {
      console.error('Error parsing user data:', error);
      return {};
    }
  };

  const userData = getUserDetails();
  
  // Don't render if no valid user data
  if (!userData) return null;

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleLogout = () => {
    try {
      // Close drawer immediately
      setDrawerOpen(false);
      
      // Clear all localStorage data
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('trialInfo'); // Clear trial info on logout
      
      // Clear any Redux store data if using Redux
      if (window.__REDUX_STORE__) {
        window.__REDUX_STORE__.dispatch({ type: 'auth/logout' });
      }
      
      // Clear sessionStorage as well
      sessionStorage.clear();
      
      // Force a complete page reload to ensure clean state
      window.location.replace('/auth/sign-in');
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Ultimate fallback - force page reload to login
      window.location.replace('/auth/sign-in');
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <>
      {/* User Profile Trigger */}
      <Paper
        onClick={toggleDrawer}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1,
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          backdropFilter: 'blur(8px)',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            transform: 'translateY(-1px)',
            boxShadow: theme.shadows[4],
            borderColor: alpha(theme.palette.primary.main, 0.3)
          }
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {getUserInitials(userData.name)}
        </Avatar>
        
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.2,
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {userData.name || 'User'}
          </Typography>
          {/* <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              lineHeight: 1,
              textTransform: 'capitalize'
            }}
          >
            {userData.role || 'Member'}
          </Typography> */}
        </Box>

        <KeyboardArrowDownIcon 
          sx={{ 
            color: 'text.secondary',
            transition: 'transform 0.2s ease-in-out',
            transform: drawerOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </Paper>

      {/* User Profile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : 320,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" fontWeight={600}>
              User Profile
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* User Info Card */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              mb: 3,
              textAlign: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '1.5rem',
                fontWeight: 600,
                mx: 'auto',
                mb: 2,
              }}
            >
              {getUserInitials(userData.name)}
            </Avatar>
            
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {userData.name || 'Unknown User'}
            </Typography>
            
            {/* <Typography variant="body2" color="text.secondary">
              {userData.role || 'No role assigned'}
            </Typography> */}
          </Paper>

          {/* User Details */}
          <List sx={{ mb: 3 }}>
            <ListItem>
              <ListItemIcon>
                <PersonIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Full Name" 
                secondary={userData.name || 'Not available'}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <EmailIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Email" 
                secondary={userData.email || 'Not available'}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <BusinessIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Organization" 
                secondary={userData.organization || 'Not available'}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          {/* Logout Button */}
          <Button
            fullWidth
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              py: 1.5,
              fontWeight: 600,
              borderRadius: 2,
              textTransform: 'none'
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
    </>
  );
}

// Styled Divider Component
const StyledDivider = styled('span')(({ theme }) => ({
  width: 1,
  height: 10,
  flexShrink: 0,
  display: 'none',
  position: 'relative',
  alignItems: 'center',
  flexDirection: 'column',
  marginLeft: theme.spacing(2.5),
  marginRight: theme.spacing(2.5),
  backgroundColor: 'currentColor',
  color: theme.vars.palette.divider,
  '&::before, &::after': {
    top: -5,
    width: 3,
    height: 3,
    content: '""',
    flexShrink: 0,
    borderRadius: '50%',
    position: 'absolute',
    backgroundColor: 'currentColor',
  },
  '&::after': { bottom: -5, top: 'auto' },
}));

// top navbar dream
export function HeaderBase({
  sx,
  data,
  slots,
  slotProps,
  onOpenNav,
  layoutQuery,

  slotsDisplay: {
    signIn = true,
    account = true,
    settings = true,
    searchbar = false,
    workspaces = true,
    menuButton = true,
    localization = false,
  } = {},

  ...other
}) {
  const theme = useTheme();

  const getUserDetails = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')) : {};

  return (
    <HeaderSection
      sx={sx}
      layoutQuery={layoutQuery}
      slots={{
        ...slots,
        leftAreaStart: slots?.leftAreaStart,
        leftArea: (
          <>
            {slots?.leftAreaStart}

            {/* -- Menu button -- */}
            {menuButton && (
              <MenuButton
                data-slot="menu-button"
                onClick={onOpenNav}
                sx={{
                  mr: 1,
                  ml: -1,
                  [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
                }}
              />
            )}

            {/* -- Logo -- */}
            <Logo data-slot="logo" />

            {/* -- Divider -- */}
            <StyledDivider data-slot="divider" />

            {/* -- Trial Version Indicator (where clock used to be) -- */}
            <TrialVersionIndicator />

            {slots?.leftAreaEnd}
          </>
        ),
        rightArea: (
          <>
            {slots?.rightAreaStart}

            <Box
              data-area="right"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {/* -- Searchbar -- */}
              {searchbar && <Searchbar data-slot="searchbar" data={data?.nav} />}

              {/* -- Language popover -- */}
              {localization && <LanguagePopover data-slot="localization" data={data?.langs} />}

              {/* -- Settings button -- */}
              {/* {settings && <SettingsButton data-slot="settings" />} */}

              {/* -- User Profile Dropdown (replaces clock and old user info) -- */}
              <UserProfileDropdown />

              {/* -- Sign in button (if needed) -- */}
              {signIn && <SignInButton />}
            </Box>

            {slots?.rightAreaEnd}
          </>
        ),
      }}
      slotProps={slotProps}
      {...other}
    />
  );
}
