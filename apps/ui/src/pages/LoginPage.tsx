import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { loginRequestSchema, type Info, type LoginRequest, type LoginResponse } from '@subzerodev/watchdog-shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';
import { api, ApiError } from '../api/client';
import { useAuthStatus } from '../auth/useAuthStatus';
import { Loading, Unreachable } from '../components/Status';
import { useAuthStore } from '../store/auth';

const apiKeySchema = z.object({ apiKey: z.string().trim().min(1, 'Enter the API key') });

type ApiKeyForm = z.infer<typeof apiKeySchema>;

function failure(error: unknown, unauthorized: string): string {
  if (error instanceof ApiError && error.status === 401) return unauthorized;

  return error instanceof Error ? error.message : 'Sign-in failed';
}

function PasswordForm() {
  const signIn = useAuthStore((state) => state.signIn);
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: LoginRequest) => {
    setError(undefined);

    try {
      const { token, username } = await api<LoginResponse>('/api/auth/login', { body: values, credential: null });

      signIn({ kind: 'token', token, username });
    } catch (reason) {
      setError(failure(reason, 'Wrong username or password'));
    }
  };

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Username"
        autoComplete="username"
        autoFocus
        {...register('username')}
        error={!!errors.username}
        helperText={errors.username && 'Enter your username'}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        {...register('password')}
        error={!!errors.password}
        helperText={errors.password && 'Enter your password'}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </Stack>
  );
}

function ApiKeyForm() {
  const signIn = useAuthStore((state) => state.signIn);
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApiKeyForm>({ resolver: zodResolver(apiKeySchema), defaultValues: { apiKey: '' } });

  const onSubmit = async ({ apiKey }: ApiKeyForm) => {
    setError(undefined);

    const credential = { kind: 'apiKey', apiKey } as const;

    try {
      // Any protected route checks the key.
      await api<Info>('/api/info', { credential });
      signIn(credential);
    } catch (reason) {
      setError(failure(reason, 'The API key was not accepted'));
    }
  };

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="API key"
        type="password"
        autoComplete="off"
        autoFocus
        {...register('apiKey')}
        error={!!errors.apiKey}
        helperText={errors.apiKey?.message}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {isSubmitting ? 'Checking…' : 'Use API key'}
      </Button>
    </Stack>
  );
}

export function LoginPage() {
  const { status, error, retry } = useAuthStatus();
  const credential = useAuthStore((state) => state.credential);
  const location = useLocation();
  const [useKey, setUseKey] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (error) return <Unreachable onRetry={retry} />;
  if (!status) return <Loading label="Connecting to the API…" />;
  if (!status.authEnabled || credential) return <Navigate to={from} replace />;

  const showKey = useKey || !status.loginEnabled;

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          SubZeroDev Watchdog
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {showKey ? 'Enter the API key to continue.' : 'Sign in to continue.'}
        </Typography>
        {showKey ? <ApiKeyForm /> : <PasswordForm />}
        {status.loginEnabled && (
          <Link component="button" type="button" variant="body2" sx={{ mt: 2 }} onClick={() => setUseKey(!useKey)}>
            {useKey ? 'Sign in with a username instead' : 'Use an API key instead'}
          </Link>
        )}
      </Paper>
    </Box>
  );
}
