// Energy slot reservation management - search, create, update, approve and cancel bookings.
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { api } from '../api/client.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyRow from '../components/EmptyRow.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusChip from '../components/StatusChip.jsx';
import { tokens } from '../theme.js';

const STATUSES = ['', 'Pending', 'Approved', 'Completed', 'Cancelled'];

const emptyCreateForm = {
  prosumerNic: '',
  stationId: '',
  slotId: '',
  energyKwh: '',
};

// Shared props for dropdowns whose empty value means "all".
const selectAllProps = { select: { displayEmpty: true }, inputLabel: { shrink: true } };

// Label for a booking window, e.g. "24/09/2026 (09:00 - 12:00)".
function slotWindow(slot) {
  const time = { hour: '2-digit', minute: '2-digit' };
  return `${new Date(slot.startTime).toLocaleDateString()} (${new Date(slot.startTime).toLocaleTimeString([], time)} - ${new Date(slot.endTime).toLocaleTimeString([], time)})`;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [stations, setStations] = useState([]);
  const [filters, setFilters] = useState({ nic: '', status: '', stationId: '', upcoming: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmRequest, setConfirmRequest] = useState(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createSlots, setCreateSlots] = useState([]);
  const [modalError, setModalError] = useState('');

  // Update Modal State
  const [editingReservation, setEditingReservation] = useState(null);
  const [updateSlots, setUpdateSlots] = useState([]);
  const [updateForm, setUpdateForm] = useState({ slotId: '', energyKwh: '' });

  // QR Display State
  const [viewingQr, setViewingQr] = useState(null);

  // Loads stations for the filter and create dialogs
  useEffect(() => {
    api
      .get('/api/stations?isActive=true')
      .then(setStations)
      .catch((err) => setError(err.message));
  }, []);

  // Builds query string from filters and fetches reservations
  const load = useCallback(async () => {
    setError('');
    const query = new URLSearchParams();
    if (filters.nic) query.set('nic', filters.nic);
    if (filters.status) query.set('status', filters.status);
    if (filters.stationId) query.set('stationId', filters.stationId);
    if (filters.upcoming) query.set('upcoming', filters.upcoming);

    try {
      setReservations(await api.get(`/api/reservations?${query.toString()}`));
    } catch (err) {
      setError(err.message);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Loads slots when a station is chosen in the Create modal
  async function handleCreateStationChange(stationId) {
    setCreateForm({ ...createForm, stationId, slotId: '' });
    setCreateSlots([]);
    if (!stationId) return;
    try {
      const slots = await api.get(`/api/stations/${stationId}/slots?availableOnly=true`);
      setCreateSlots(slots);
    } catch (err) {
      setModalError(err.message);
    }
  }

  // Submits a new reservation through the API
  async function handleCreateSubmit(e) {
    e.preventDefault();
    setModalError('');
    try {
      await api.post('/api/reservations', {
        prosumerNic: createForm.prosumerNic.trim().toUpperCase(),
        stationId: createForm.stationId,
        slotId: createForm.slotId,
        energyKwh: Number(createForm.energyKwh),
      });
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      setCreateSlots([]);
      setSuccess('Reservation created successfully.');
      load();
    } catch (err) {
      setModalError(err.message);
    }
  }

  // Opens the update modal and loads slots for the reservation's station
  async function openUpdateModal(reservation) {
    setEditingReservation(reservation);
    setModalError('');
    setUpdateForm({
      slotId: reservation.slotId,
      energyKwh: reservation.energyKwh,
    });
    try {
      const slots = await api.get(`/api/stations/${reservation.stationId}/slots?availableOnly=false`);
      setUpdateSlots(slots);
    } catch (err) {
      setError(err.message);
    }
  }

  // Submits an update / reschedule (API checks the 12 hour rule)
  async function handleUpdateSubmit(e) {
    e.preventDefault();
    setModalError('');
    try {
      await api.put(`/api/reservations/${editingReservation.id}`, {
        slotId: updateForm.slotId,
        energyKwh: Number(updateForm.energyKwh),
      });
      setEditingReservation(null);
      setSuccess('Reservation updated successfully.');
      load();
    } catch (err) {
      setModalError(err.message);
    }
  }

  // Approves a pending booking, which makes the API issue the QR token
  async function approve(id) {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/reservations/${id}/approve`);
      setSuccess('Reservation approved and QR token generated.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Asks before cancelling; the 12 hour notice rule is enforced by the API
  function handleCancel(id) {
    setConfirmRequest({
      title: 'Cancel this reservation?',
      message: "The battery slot will be released for someone else. Cancellations need at least 12 hours' notice.",
      confirmLabel: 'Cancel reservation',
      cancelLabel: 'Keep reservation',
      onConfirm: () => cancel(id),
    });
  }

  // Cancels a booking; 12 hour notice rule enforced by API
  async function cancel(id) {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/reservations/${id}/cancel`);
      setSuccess('Reservation cancelled and slot capacity restored.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const updateSlotValue = updateSlots.some((slot) => slot.id === updateForm.slotId) ? updateForm.slotId : '';

  return (
    <>
      <PageHeader
        title="Energy Slot Reservations"
        subtitle="Search, book, approve and reschedule power trading slots"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>
            New Reservation
          </Button>
        }
      />

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
            <TextField
              label="Prosumer NIC"
              placeholder="Search by NIC"
              size="small"
              value={filters.nic}
              onChange={(e) => setFilters({ ...filters, nic: e.target.value })}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              label="Microgrid Node"
              size="small"
              value={filters.stationId}
              onChange={(e) => setFilters({ ...filters, stationId: e.target.value })}
              slotProps={selectAllProps}
            >
              <MenuItem value="">All Stations</MenuItem>
              {stations.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              size="small"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              slotProps={selectAllProps}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s || 'All statuses'}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Timeline"
              size="small"
              value={filters.upcoming}
              onChange={(e) => setFilters({ ...filters, upcoming: e.target.value })}
              slotProps={selectAllProps}
            >
              <MenuItem value="">All Bookings</MenuItem>
              <MenuItem value="true">Upcoming Only</MenuItem>
              <MenuItem value="false">Past History</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Reservations */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Prosumer</TableCell>
                <TableCell>Node</TableCell>
                <TableCell>Reservation Time</TableCell>
                <TableCell>Energy (kWh)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>QR Token</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map((r) => {
                const isActionable = r.status === 'Pending' || r.status === 'Approved';
                return (
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
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(r.reservationTime).toLocaleString()}</TableCell>
                    <TableCell>{r.energyKwh} kWh</TableCell>
                    <TableCell>
                      <StatusChip label={r.status} />
                    </TableCell>
                    <TableCell>
                      {r.qrToken ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          startIcon={<QrCode2Icon />}
                          onClick={() => setViewingQr(r)}
                          title="View QR Token"
                          sx={{ fontFamily: tokens.mono }}
                        >
                          {r.qrToken.slice(0, 8)}...
                        </Button>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {r.status === 'Pending' && (
                        <Button size="small" variant="contained" onClick={() => approve(r.id)} sx={{ mr: 1 }}>
                          Approve
                        </Button>
                      )}
                      {isActionable && (
                        <Button size="small" onClick={() => openUpdateModal(r)} title="Reschedule or edit energy">
                          Edit
                        </Button>
                      )}
                      {isActionable && (
                        <Button size="small" color="error" onClick={() => handleCancel(r.id)}>
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {reservations.length === 0 && <EmptyRow colSpan={7} text="No reservations match the current filter." />}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create reservation dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { component: 'form', onSubmit: handleCreateSubmit } }}
      >
        <DialogTitle>Book Energy Trading Slot</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {modalError && <Alert severity="error">{modalError}</Alert>}
            <TextField
              label="Prosumer NIC"
              placeholder="e.g. 198512345678"
              value={createForm.prosumerNic}
              onChange={(e) => setCreateForm({ ...createForm, prosumerNic: e.target.value })}
              helperText="Account must be active in the system."
              required
              fullWidth
            />
            <TextField
              select
              label="Microgrid Node"
              value={createForm.stationId}
              onChange={(e) => handleCreateStationChange(e.target.value)}
              required
              fullWidth
            >
              {stations.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.location})
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <TextField
                select
                label="Booking Time Window (Within 7 Days)"
                value={createForm.slotId}
                onChange={(e) => setCreateForm({ ...createForm, slotId: e.target.value })}
                disabled={!createForm.stationId}
                helperText={createForm.stationId ? undefined : 'Choose a station first'}
                required
                fullWidth
              >
                {createSlots.map((slot) => (
                  <MenuItem key={slot.id} value={slot.id}>
                    {slotWindow(slot)} — {slot.availableSlots} free bays
                  </MenuItem>
                ))}
              </TextField>
              {createForm.stationId && createSlots.length === 0 && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, ml: 1.75 }}>
                  No open slots available for this station.
                </Typography>
              )}
            </Box>
            <TextField
              label="Energy to Trade (kWh)"
              type="number"
              placeholder="e.g. 15.0"
              value={createForm.energyKwh}
              onChange={(e) => setCreateForm({ ...createForm, energyKwh: e.target.value })}
              required
              fullWidth
              slotProps={{ htmlInput: { step: 0.1, min: 0.1 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            Submit Booking
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update / reschedule dialog */}
      {editingReservation && (
        <Dialog
          open
          onClose={() => setEditingReservation(null)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { component: 'form', onSubmit: handleUpdateSubmit } }}
        >
          <DialogTitle>Reschedule / Edit Reservation</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {modalError && <Alert severity="error">{modalError}</Alert>}
              <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
                Updates require at least 12 hours notice prior to the scheduled window.
              </Alert>
              <TextField
                label="Prosumer"
                value={`${editingReservation.prosumerName} (${editingReservation.prosumerNic})`}
                disabled
                fullWidth
              />
              <TextField label="Microgrid Node" value={editingReservation.stationName} disabled fullWidth />
              <TextField
                select
                label="Time Slot Window"
                value={updateSlotValue}
                onChange={(e) => setUpdateForm({ ...updateForm, slotId: e.target.value })}
                required
                fullWidth
              >
                {updateSlots.map((slot) => (
                  <MenuItem key={slot.id} value={slot.id}>
                    {slotWindow(slot)} —{' '}
                    {slot.id === editingReservation.slotId ? 'Current slot' : `${slot.availableSlots} free bays`}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Energy (kWh)"
                type="number"
                value={updateForm.energyKwh}
                onChange={(e) => setUpdateForm({ ...updateForm, energyKwh: e.target.value })}
                required
                fullWidth
                slotProps={{ htmlInput: { step: 0.1, min: 0.1 } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="secondary" onClick={() => setEditingReservation(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* QR token dialog */}
      {viewingQr && (
        <Dialog open onClose={() => setViewingQr(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ textAlign: 'center' }}>Transaction Token</DialogTitle>
          <DialogContent sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 88,
                height: 88,
                mx: 'auto',
                mb: 2,
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
                bgcolor: tokens.brandSoft,
                color: tokens.navy,
              }}
            >
              <QrCode2Icon sx={{ fontSize: 56 }} />
            </Box>
            <Typography variant="subtitle1">{viewingQr.prosumerName}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {viewingQr.stationName}
            </Typography>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#F1F5F9',
                fontFamily: tokens.mono,
                fontSize: 13,
                wordBreak: 'break-all',
                userSelect: 'all',
              }}
            >
              {viewingQr.qrToken}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Scanned by Grid Operator on-site to verify and complete energy transfer.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button fullWidth variant="outlined" color="secondary" onClick={() => setViewingQr(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </>
  );
}
