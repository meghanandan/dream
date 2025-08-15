import { useState } from "react";
import { useForm } from "react-hook-form";
import { z as zod } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Box, Stack, Typography, Card, CardContent, Divider, Alert,
  Link, IconButton, InputAdornment
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { login } from "src/store/authSlice";
import { PATH_AFTER_LOGIN } from "src/config-global";
import { useBoolean } from "src/hooks/use-boolean";
import { RouterLink } from "src/routes/components";
import { Iconify } from "src/components/iconify";
import { Form, Field } from "src/components/hook-form";
import dreamLogo from 'src/assets/logo/dream-logo.png';

const SignInSchema = zod.object({
  email: zod.string().email({ message: 'Enter a valid email' }).min(1, { message: 'Email is required' }),
  password: zod.string().min(6, { message: 'Password must be at least 6 characters' }).min(1, { message: 'Password is required' }),
});

export function JwtSignInView() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialInfo, setTrialInfo] = useState({
    organizationName: '',
    supportEmail: '',
    trialEndDate: ''
  });
  const passwordVisible = useBoolean();
  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Clear any previous errors
      setErrorMsg("");
      
      // Attempt login
      console.log('Dispatching login action with:', { email: data.email, licence_type: 'DREAMPRO' });
      const result = await dispatch(login({ email: data.email, password: data.password, licence_type: 'DREAMPRO' }));
      console.log('Login result full object:', JSON.stringify(result, null, 2));
      
      // Handle success
      if (result.meta.requestStatus === "fulfilled") {
        console.log('Login successful, redirecting to:', returnTo || PATH_AFTER_LOGIN);
        router.push(returnTo || PATH_AFTER_LOGIN);
        return;
      }
      
      // Handle rejection
      if (result.meta.requestStatus === "rejected") {
        console.log('Login rejected. Full payload:', JSON.stringify(result.payload, null, 2));
        console.log('Payload type:', typeof result.payload);
        console.log('Has code property:', result.payload && 'code' in result.payload);
        
        // Handle trial expired error specifically
        if (result.payload && result.payload.code === 'TRIAL_EXPIRED') {
          console.log('Trial expired error detected, setting specific message');
          setTrialExpired(true);
          setTrialInfo({
            organizationName: result.payload.organizationName || 'your organization',
            supportEmail: result.payload.supportEmail || 'support@vyva.ai',
            trialEndDate: result.payload.trialEndDate ? new Date(result.payload.trialEndDate).toLocaleDateString() : 'recently'
          });
          setErrorMsg(result.payload.message || 'Your trial has expired. Please contact your administrator.');
          return;
        }
        
        // Handle object with message
        if (result.payload && typeof result.payload === 'object' && result.payload.message) {
          console.log('Object with message property detected:', result.payload.message);
          setErrorMsg(result.payload.message);
          return;
        }
        
        // Handle string error
        if (typeof result.payload === 'string') {
          console.log('String error detected:', result.payload);
          setErrorMsg(result.payload);
          return;
        }
        
        // Fallback error
        console.log('No specific error format detected, using fallback');
        setErrorMsg("Authentication failed");
      }
    } catch (err) {
      console.error('Login error in catch block:', err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to sign in");
    }
  });

  return (
    <Box sx={{ width: "100%", maxWidth: 400, mx: "auto" }}>
      {/* Logo/Brand */}
      <Box sx={{ textAlign: "left", mb: 3 }}>
        <img src={dreamLogo} alt="Dream Logo" style={{ width: "120px", marginBottom: "16px" }} />
        <Typography variant="h5" fontWeight="bold" sx={{ color: "text.primary" }}>
          Welcome back
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 1 }}>
          Sign in to your account to continue
        </Typography>
      </Box>
      {/* Card */}
      <Card elevation={0} sx={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
        <CardContent sx={{ p: 0, borderRadius: 0 }}>
          {/* Error Alert */}
          {!!errorMsg && !trialExpired && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMsg}
            </Alert>
          )}
          
          {/* Trial Expired Alert with more details */}
          {trialExpired && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3, 
                '& .MuiAlert-message': { 
                  width: '100%' 
                } 
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Trial Period Expired
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                The trial for <b>{trialInfo.organizationName}</b> expired on <b>{trialInfo.trialEndDate}</b>.
              </Typography>
              <Typography variant="body2">
                Please contact your administrator or email <Link href={`mailto:${trialInfo.supportEmail}`} sx={{ fontWeight: 'medium' }}>{trialInfo.supportEmail}</Link> to upgrade your account.
              </Typography>
            </Alert>
          )}
          <Form methods={methods} style={{ borderRadius: 0}}>
            <Stack spacing={3}>
              {/* Email */}
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={500}>
                  Email <span style={{ color: "red" }}>*</span>
                </Typography>
                <Field.Text
                  name="email"
                  fullWidth
                  placeholder="Enter your email"
                  sx={{
                    backgroundColor: "#fff",
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
                    borderRadius: 2,
                    input: { padding: "14px" },
                  }}
                />
              </Stack>
              {/* Password */}
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight={500}>
                    Password <span style={{ color: "red" }}>*</span>
                  </Typography>
                  <Link component={RouterLink} href="/forgot-password" variant="body2" underline="hover" sx={{ color: "primary.main" }}>
                    Forgot password?
                  </Link>
                </Box>
                <Field.Text
                  name="password"
                  fullWidth
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                        >
                          <Iconify icon={showPassword ? "solar:eye-bold" : "solar:eye-closed-bold"} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    backgroundColor: "#fff",
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
                    borderRadius: 2,
                    input: { padding: "14px" },
                  }}
                />
              </Stack>
              {/* Sign In Button */}
              <LoadingButton
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                loading={isSubmitting}
                loadingIndicator="Signing in..."
                sx={{
                  backgroundColor: "#ff9100",
                  color: "#fff",
                  fontWeight: "bold",
                  borderRadius: 2,
                  textTransform: "none",
                  fontSize: "1rem",
                  height: 48,
                  "&:hover": { backgroundColor: "#f28b00" },
                }}
                onClick={onSubmit}
              >
                Sign in
              </LoadingButton>
            </Stack>
          </Form>
          {/* OR Divider */}
         {/* <Box sx={{ my: 4, position: "relative" }}>
            <Divider />
            <Box sx={{
              position: "absolute",
              top: "-14px",
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: "#fff",
              px: 2,
              color: "text.secondary",
              fontSize: 12,
              letterSpacing: 1,
              fontWeight: "medium",
              textTransform: "uppercase",
            }}>
              Or continue with
            </Box>
          </Box>
           Social Login Buttons */}
           {/* 
          <Stack direction="row" spacing={2} mb={2}>
            <LoadingButton
              variant="outlined"
              fullWidth
              startIcon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ display: "inline-block" }}>
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              }
              sx={{ bgcolor: "#fff" }}
            >
              Google
            </LoadingButton>
           <LoadingButton
              variant="outlined"
              fullWidth
              startIcon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ display: "inline-block" }}>
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.221.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
                </svg>
              }
              sx={{ bgcolor: "#fff" }}
            >
              Outlook
            </LoadingButton> 
          </Stack> */}
          {/* Signup */}
        </CardContent>
      </Card>
    </Box>
  );
}

export default JwtSignInView;
