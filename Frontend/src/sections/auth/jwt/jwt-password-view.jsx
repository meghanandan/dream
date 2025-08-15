import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Alert,
  IconButton,
  InputAdornment,
  LinearProgress
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import { useLocation, useNavigate } from 'react-router-dom';
import { useBoolean } from 'src/hooks/use-boolean';
import { Form, Field } from 'src/components/hook-form';
import { passwordCreate } from 'src/auth/context/jwt';
import { useAuthContext } from 'src/auth/hooks';
import dreamLogo from 'src/assets/logo/dream-logo.png';


export const PasswordSchema = zod
  .object({
    password: zod
      .string()
      .min(8, { message: 'Password must be at least 8 characters!' })
      .regex(/[A-Z]/, { message: 'At least one uppercase letter required.' })
      .regex(/[a-z]/, { message: 'At least one lowercase letter required.' })
      .regex(/[0-9]/, { message: 'At least one number required.' })
      .regex(/[@$!%*?&]/, {
        message: 'At least one special character (@, $, !, %, *, ?, &) required.',
      }),
    confirmPassword: zod.string().min(1, { message: 'Confirm your password.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
  });

function getPasswordStrength(password) {
  let score = 0;
  if (!password) return score;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;
  return score;
}

export function JwtPasswordView() {
  const { checkUserSession } = useAuthContext();
  const password = useBoolean();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const emailFromURL = params.get('email') || '';

  const defaultValues = {
    email: emailFromURL,
    password: '',
    confirmPassword: '',
  };

  const methods = useForm({
    resolver: zodResolver(PasswordSchema),
    defaultValues,
    mode: 'onTouched',
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = methods;

  const passwordValue = watch('password');
  const strength = getPasswordStrength(passwordValue);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await passwordCreate({
        email: emailFromURL,
        password: data.password,
      });
      await checkUserSession?.();
      navigate('/auth/sign-in');
    } catch (error) {
      setErrorMsg(error?.message || 'Unable to reset password.');
    }
  });

  const strengthLabels = [
    '',
    'Too weak',
    'Weak',
    'Medium',
    'Strong',
    'Very strong',
  ];

  return (

      <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
        {/* Logo/Brand */}
          <Box sx={{ textAlign: "left", mb: 3 }}>
            <img src={dreamLogo} alt="Dream Logo" style={{ width: "120px", marginBottom: "16px" }} />
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ color: 'text.primary' }}
            >
              Create New Password
            </Typography>
            <Typography sx={{ color: 'text.secondary', mt: 1 }}>
              Set a strong password to secure your account
            </Typography>
        </Box>
        <Card elevation={0} sx={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
          <CardContent sx={{ p: 0 }}>
            {!!errorMsg && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMsg}
              </Alert>
            )}
            <Form methods={methods} onSubmit={onSubmit}>
              <Stack spacing={3} sx={{ mt: 1 }}>
                {/* Password */}
                <Field.Text
                  name="email"
                  label="Email address"
                  type="email"
                  disabled
                  sx={{
                    backgroundColor: '#fff',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
                    borderRadius: 2,
                    input: { padding: '14px' },
                  }}
                />
                <Field.Text
                  name="password"
                  label="Password"
                  placeholder="8+ characters"
                  type={password.value ? 'text' : 'password'}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={password.onToggle}
                          edge="end"
                          aria-label={password.value ? 'Hide password' : 'Show password'}
                        >
                          {password.value ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText={errors.password?.message}
                  error={!!errors.password}
                  autoComplete="new-password"
                  sx={{
                    backgroundColor: '#fff',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
                    borderRadius: 2,
                    input: { padding: '14px' },
                  }}
                />
                {/* Password strength meter */}
                <Box sx={{ px: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(strength / 5) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 2,
                      backgroundColor: '#f5f5f5',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor:
                          strength < 3
                            ? '#ff5252'
                            : strength < 5
                              ? '#ffd600'
                              : '#43a047',
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    color={strength < 3 ? 'error' : 'text.secondary'}
                  >
                    {strengthLabels[strength]}
                  </Typography>
                </Box>
                <Field.Text
                  name="confirmPassword"
                  label="Confirm Password"
                  placeholder="Re-type password"
                  type={password.value ? 'text' : 'password'}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={password.onToggle}
                          edge="end"
                          aria-label={password.value ? 'Hide password' : 'Show password'}
                        >
                          {password.value ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText={errors.confirmPassword?.message}
                  error={!!errors.confirmPassword}
                  autoComplete="new-password"
                  inputProps={{ 'data-testid': 'confirm-password' }}
                  sx={{
                    backgroundColor: '#fff',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
                    borderRadius: 2,
                    input: { padding: '14px' },
                  }}
                />
                <LoadingButton
                  fullWidth
                  color="inherit"
                  size="large"
                  type="submit"
                  variant="contained"
                  loading={isSubmitting}
                  loadingIndicator="Creating password…"
                  sx={{
                    backgroundColor: '#ff9100',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    height: 48,
                    '&:hover': {
                      backgroundColor: '#f28b00',
                    },
                  }}
                >
                  Create Password
                </LoadingButton>
              </Stack>
            </Form>
          </CardContent>
        </Card>
      </Box>
  );
}
