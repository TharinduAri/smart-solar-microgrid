// Home screen showing live metrics, recent reservation activity, and station capacity.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BoltIcon from '@mui/icons-material/Bolt';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { api } from '../api/client.js';
import EmptyRow from '../components/EmptyRow.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusChip from '../components/StatusChip.jsx';
import { tones } from '../theme.js';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');

  // Loads dashboard statistics, recent activity, and station status.
  useEffect(() => {
    Promise.all([
      api.get('/api/reservations/dashboard'),
      api.get('/api/reservations'),
      api.get('/api/stations'),
    ])
      .then(([dashSummary, reservations, stationList]) => {
        setSummary(dashSummary);
        setRecentReservations(reservations.slice(0, 5));
        setStations(stationList);
      })
      .catch((err) => setError(err.message));
  }, []);

  const cards = [
    { label: 'Pending Reservations', value: summary?.pendingReservations, icon: <HourglassEmptyIcon fontSize="small" />, tone: 'warning' },
    { label: 'Approved Future Bookings', value: summary?.approvedFutureReservations, icon: <EventAvailableIcon fontSize="small" />, tone: 'success' },
    { label: 'Completed Transfers', value: summary?.completedReservations, icon: <CheckCircleIcon fontSize="small" />, tone: 'info' },
    { label: 'Active Microgrid Hubs', value: summary?.activeStations, icon: <BoltIcon fontSize="small" />, tone: 'brand' },
  ];

  return (
    <>
      <PageHeader
        title="Microgrid Operations Dashboard"
        subtitle="Live overview of solar power trading and battery storage slots"
        actions={
          <>
            <Button component={Link} to="/reservations" variant="contained" startIcon={<CalendarTodayIcon />}>
              Manage Bookings
            </Button>
            <Button component={Link} to="/stations" variant="outlined" color="secondary" startIcon={<BoltIcon />}>
              Grid Hubs
            </Button>
          </>
        }
      />

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Metric cards */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          mb: 3,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' } }}>
        {/* Recent reservations */}
        <Card>
          <CardHeaderRow title="Recent Energy Trading Activity" linkTo="/reservations" linkLabel="View all" />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Prosumer</TableCell>
                  <TableCell>Node</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Energy</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentReservations.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {r.prosumerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.prosumerNic}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.stationName}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {new Date(r.reservationTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.energyKwh} kWh</TableCell>
                    <TableCell>
                      <StatusChip label={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {recentReservations.length === 0 && <EmptyRow colSpan={5} text="No recent reservation activity." />}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Microgrid hub status */}
        <Card>
          <CardHeaderRow title="Solar Microgrid Hubs" linkTo="/stations" linkLabel="Manage hubs" />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Hub Name</TableCell>
                  <TableCell>Throughput</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stations.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {s.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.location}
                      </Typography>
                    </TableCell>
                    <TableCell>{s.capacityKwh} kW/h</TableCell>
                    <TableCell>{s.totalSlots} bays</TableCell>
                    <TableCell>
                      <StatusChip label={s.isActive ? 'Active' : 'Offline'} tone={s.isActive ? 'success' : 'neutral'} />
                    </TableCell>
                  </TableRow>
                ))}
                {stations.length === 0 && <EmptyRow colSpan={4} text="No microgrid hubs registered." />}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </>
  );
}

// One metric: label, tinted icon badge and the live value.
function StatCard({ label, value, icon, tone }) {
  const colors = tones[tone];
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 1.25,
              display: 'grid',
              placeItems: 'center',
              bgcolor: colors.bg,
              color: colors.fg,
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography variant="h4" sx={{ mt: 1 }}>
          {value ?? '—'}
        </Typography>
      </CardContent>
    </Card>
  );
}

// Card title with a link to the full page.
function CardHeaderRow({ title, linkTo, linkLabel }) {
  return (
    <Stack direction="row" sx={{ px: 2.5, py: 2, justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="subtitle1" component="h2">
        {title}
      </Typography>
      <Button component={Link} to={linkTo} size="small" endIcon={<ArrowForwardIcon />}>
        {linkLabel}
      </Button>
    </Stack>
  );
}
