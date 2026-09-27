// Shared shell for every signed-in page: navy navigation drawer plus the page body.
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import SpeedIcon from '@mui/icons-material/Speed';
import BoltIcon from '@mui/icons-material/Bolt';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleIcon from '@mui/icons-material/People';
import BadgeIcon from '@mui/icons-material/Badge';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext.jsx';
import BrandMark from './BrandMark.jsx';
import { tokens } from '../theme.js';

const DRAWER_WIDTH = 256;

const ROLE_LABELS = { Backoffice: 'Backoffice', GridOperator: 'Grid Operator' };

export default function Layout() {
  const { user, logout, isBackoffice } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ends the session and returns to the login screen.
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Grid Operators do not see the user administration screens.
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: <SpeedIcon /> },
    { to: '/stations', label: 'Microgrid Nodes', icon: <BoltIcon /> },
    { to: '/reservations', label: 'Reservations', icon: <CalendarTodayIcon /> },
    ...(isBackoffice
      ? [
          { to: '/prosumers', label: 'Prosumers', icon: <PeopleIcon /> },
          { to: '/users', label: 'Web Users', icon: <BadgeIcon /> },
        ]
      : []),
  ];

  const drawer = (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ px: 3, py: 3 }}>
        <BrandMark />
      </Box>

      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {links.map((link) => (
          <ListItemButton
            key={link.to}
            component={NavLink}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              color: tokens.navyText,
              '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 40 },
              '&:hover': { bgcolor: alpha('#FFFFFF', 0.06) },
              '&.active': { bgcolor: alpha(tokens.brand, 0.16), color: tokens.brand },
            }}
          >
            <ListItemIcon>{link.icon}</ListItemIcon>
            <ListItemText primary={link.label} slotProps={{ primary: { sx: { fontWeight: 500 } } }} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ p: 2, borderTop: `1px solid ${alpha('#FFFFFF', 0.08)}` }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: tokens.brand, color: tokens.onBrand, fontWeight: 700 }}>
            {initials(user?.fullName)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: '#FFFFFF', fontWeight: 500 }}>
              {user?.fullName}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.navyText }}>
              {ROLE_LABELS[user?.role] ?? user?.role}
            </Typography>
          </Box>
        </Stack>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            color: '#FFFFFF',
            borderColor: alpha('#FFFFFF', 0.24),
            '&:hover': { borderColor: '#FFFFFF', bgcolor: alpha('#FFFFFF', 0.06) },
          }}
        >
          Sign out
        </Button>
      </Box>
    </Stack>
  );

  const paperSx = { width: DRAWER_WIDTH, bgcolor: tokens.navy, color: tokens.navyText, borderRight: 'none' };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Small screens get a top bar with a menu button instead of the fixed drawer. */}
      <AppBar position="fixed" color="secondary" elevation={0} sx={{ display: { md: 'none' } }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          <BrandMark compact />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' } }}
          slotProps={{ paper: { sx: paperSx } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' } }}
          slotProps={{ paper: { sx: paperSx } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
        <Toolbar sx={{ display: { md: 'none' } }} />
        <Outlet />
      </Box>
    </Box>
  );
}

// Two letters for the avatar, taken from the user's name.
function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
