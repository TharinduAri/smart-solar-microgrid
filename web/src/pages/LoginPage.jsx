// Login screen. Sends the credentials to /api/auth/login and routes on the role.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext.jsx';
import { tokens } from '../theme.js';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Submits the credentials and blocks prosumers, who belong on the mobile app.
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(username, password);
      if (result.role === 'Prosumer') {
        setError('Prosumer accounts must sign in through the mobile application.');
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: `linear-gradient(135deg, ${tokens.navyLight}, ${tokens.navy})`,
      }}
    >
      <Card sx={{ width: 'min(420px, 100%)', borderRadius: 3, border: 'none' }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: tokens.brandSoft,
                color: tokens.brand,
              }}
            >
              <WbSunnyIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h5" component="h1" sx={{ pt: 1 }}>
              Smart Solar Microgrid
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Backoffice &amp; Grid Operator portal
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField
              label="Email or NIC"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              fullWidth
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              fullWidth
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((shown) => !shown)}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>
              {busy ? 'Signing in...' : 'Sign in'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
