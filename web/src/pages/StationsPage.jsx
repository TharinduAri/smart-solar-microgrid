// Microgrid node management - lists nodes, edits nodes, manages slots, and handles lifecycle.
import { useEffect, useState } from 'react';
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
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import LocationPicker, { MapsProvider } from '../components/LocationPicker.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyRow from '../components/EmptyRow.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusChip from '../components/StatusChip.jsx';

const emptyStationForm = { name: '', location: '', latitude: '', longitude: '', capacityKwh: '', totalSlots: '' };
const emptySlotForm = { startTime: '', endTime: '', totalSlots: '' };

const stationFields = [
  ['name', 'Name', 'text'],
  ['location', 'Location', 'text'],
  ['capacityKwh', 'Capacity (kW/h)', 'number'],
  ['totalSlots', 'Battery slots', 'number'],
];

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [createForm, setCreateForm] = useState(emptyStationForm);
  const [editingStation, setEditingStation] = useState(null);
  const [selectedStationForSlots, setSelectedStationForSlots] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [error, setError] = useState('');
  const [slotError, setSlotError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmRequest, setConfirmRequest] = useState(null);
  const { isBackoffice } = useAuth();

  // Reloads the node list from the Web API.
  async function load() {
    try {
      setStations(await api.get('/api/stations'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Creates a node from the inline form.
  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/api/stations', {
        name: createForm.name,
        location: createForm.location,
        latitude: Number(createForm.latitude),
        longitude: Number(createForm.longitude),
        capacityKwh: Number(createForm.capacityKwh),
        totalSlots: Number(createForm.totalSlots),
      });
      setCreateForm(emptyStationForm);
      setSuccess('Microgrid node registered successfully.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Updates an existing node.
  async function handleUpdateStation(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put(`/api/stations/${editingStation.id}`, {
        name: editingStation.name,
        location: editingStation.location,
        latitude: Number(editingStation.latitude),
        longitude: Number(editingStation.longitude),
        capacityKwh: Number(editingStation.capacityKwh),
        totalSlots: Number(editingStation.totalSlots),
      });
      setEditingStation(null);
      setSuccess('Node updated successfully.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Asks before deleting a node.
  function handleDeleteStation(station) {
    setConfirmRequest({
      title: 'Delete microgrid node?',
      message: `Are you sure you want to delete station "${station.name}"?`,
      confirmLabel: 'Delete',
      onConfirm: () => deleteStation(station),
    });
  }

  // Deletes a node if no active reservations exist.
  async function deleteStation(station) {
    setError('');
    setSuccess('');
    try {
      await api.del(`/api/stations/${station.id}`);
      setSuccess(`Station "${station.name}" deleted.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Toggles a node in or out of service; the API blocks unsafe deactivation.
  async function toggleActive(station) {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/stations/${station.id}/${station.isActive ? 'deactivate' : 'activate'}`);
      setSuccess(`Station ${station.isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Loads booking slots for the selected station.
  async function openSlotManager(station) {
    setSelectedStationForSlots(station);
    setSlotError('');
    setSlotForm({ ...emptySlotForm, totalSlots: station.totalSlots });
    setEditingSlotId(null);
    try {
      const data = await api.get(`/api/stations/${station.id}/slots?availableOnly=false`);
      setSlots(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // Reloads slots for the currently open station.
  async function refreshSlots() {
    if (!selectedStationForSlots) return;
    try {
      const data = await api.get(`/api/stations/${selectedStationForSlots.id}/slots?availableOnly=false`);
      setSlots(data);
    } catch (err) {
      setSlotError(err.message);
    }
  }

  // Submits a new booking slot or updates an existing one.
  async function handleSaveSlot(event) {
    event.preventDefault();
    setSlotError('');
    try {
      if (editingSlotId) {
        await api.put(`/api/stations/slots/${editingSlotId}`, {
          startTime: new Date(slotForm.startTime).toISOString(),
          endTime: new Date(slotForm.endTime).toISOString(),
          totalSlots: Number(slotForm.totalSlots),
        });
      } else {
        await api.post(`/api/stations/${selectedStationForSlots.id}/slots`, {
          startTime: new Date(slotForm.startTime).toISOString(),
          endTime: new Date(slotForm.endTime).toISOString(),
          totalSlots: Number(slotForm.totalSlots),
        });
      }
      setSlotForm({ ...emptySlotForm, totalSlots: selectedStationForSlots.totalSlots });
      setEditingSlotId(null);
      refreshSlots();
    } catch (err) {
      setSlotError(err.message);
    }
  }

  // Asks before deleting a booking slot.
  function handleDeleteSlot(slotId) {
    setConfirmRequest({
      title: 'Delete this booking slot window?',
      confirmLabel: 'Delete',
      onConfirm: () => deleteSlot(slotId),
    });
  }

  // Deletes an unused booking slot.
  async function deleteSlot(slotId) {
    setSlotError('');
    try {
      await api.del(`/api/stations/slots/${slotId}`);
      refreshSlots();
    } catch (err) {
      setSlotError(err.message);
    }
  }

  // Helper to pre-populate slot edit fields in ISO format suitable for datetime-local input.
  function startEditSlot(slot) {
    setEditingSlotId(slot.id);
    const startIso = new Date(slot.startTime).toISOString().slice(0, 16);
    const endIso = new Date(slot.endTime).toISOString().slice(0, 16);
    setSlotForm({
      startTime: startIso,
      endTime: endIso,
      totalSlots: slot.totalSlots,
    });
  }

  // Leaves slot edit mode and resets the form for a new window.
  function cancelEditSlot() {
    setEditingSlotId(null);
    setSlotForm({ ...emptySlotForm, totalSlots: selectedStationForSlots.totalSlots });
  }

  return (
    <MapsProvider>
      <PageHeader
        title="Microgrid Nodes & Battery Storage"
        subtitle="Solar grid hubs, their GPS position and bookable battery slot windows"
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

      {isBackoffice && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" component="h2" sx={{ mb: 2 }}>
              Register a new solar grid hub
            </Typography>
            <Box component="form" onSubmit={handleCreate}>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                }}
              >
                {stationFields.map(([key, label, type]) => (
                  <TextField
                    key={key}
                    label={label}
                    type={type}
                    size="small"
                    value={createForm[key]}
                    onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
                    required
                    slotProps={{ htmlInput: { step: 'any' } }}
                  />
                ))}
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  GPS position
                </Typography>
                <LocationPicker
                  latitude={createForm.latitude}
                  longitude={createForm.longitude}
                  onChange={(coords) => setCreateForm((form) => ({ ...form, ...coords }))}
                />
              </Box>
              <Button type="submit" variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }}>
                Add node
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>GPS</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Slots</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stations.map((station) => (
                <TableRow key={station.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{station.name}</TableCell>
                  <TableCell>{station.location}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                  </TableCell>
                  <TableCell>{station.capacityKwh} kW/h</TableCell>
                  <TableCell>{station.totalSlots} bays</TableCell>
                  <TableCell>
                    <StatusChip
                      label={station.isActive ? 'Active' : 'Inactive'}
                      tone={station.isActive ? 'success' : 'neutral'}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={<ScheduleIcon />}
                      onClick={() => openSlotManager(station)}
                      title="Manage booking time windows and battery slots"
                    >
                      Slots
                    </Button>
                    {isBackoffice && (
                      <>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setEditingStation(station)} sx={{ ml: 1 }}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={station.isActive ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size="small"
                            color={station.isActive ? 'warning' : 'success'}
                            onClick={() => toggleActive(station)}
                          >
                            <PowerSettingsNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDeleteStation(station)}>
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {stations.length === 0 && <EmptyRow colSpan={7} text="No microgrid nodes registered yet." />}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Edit station dialog */}
      {editingStation && (
<<<<<<< HEAD
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Edit Microgrid Node</h5>
                <button type="button" className="btn-close" onClick={() => setEditingStation(null)} />
              </div>
              <form onSubmit={handleUpdateStation}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small text-muted">Node Name</label>
                    <input
                      className="form-control"
                      value={editingStation.name}
                      onChange={(e) => setEditingStation({ ...editingStation, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-muted">Location</label>
                    <input
                      className="form-control"
                      value={editingStation.location}
                      onChange={(e) => setEditingStation({ ...editingStation, location: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-muted">GPS position</label>
                    <LocationPicker
                      latitude={editingStation.latitude}
                      longitude={editingStation.longitude}
                      onChange={(coords) => setEditingStation((station) => ({ ...station, ...coords }))}
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small text-muted">Capacity (kW/h)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={editingStation.capacityKwh}
                        onChange={(e) => setEditingStation({ ...editingStation, capacityKwh: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-muted">Battery Storage Slots</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editingStation.totalSlots}
                        onChange={(e) => setEditingStation({ ...editingStation, totalSlots: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setEditingStation(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning fw-semibold">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
=======
        <Dialog
          open
          onClose={() => setEditingStation(null)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { component: 'form', onSubmit: handleUpdateStation } }}
        >
          <DialogTitle>Edit Microgrid Node</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Node Name"
                value={editingStation.name}
                onChange={(e) => setEditingStation({ ...editingStation, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Location"
                value={editingStation.location}
                onChange={(e) => setEditingStation({ ...editingStation, location: e.target.value })}
                required
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Latitude"
                  type="number"
                  value={editingStation.latitude}
                  onChange={(e) => setEditingStation({ ...editingStation, latitude: e.target.value })}
                  required
                  fullWidth
                  slotProps={{ htmlInput: { step: 'any' } }}
                />
                <TextField
                  label="Longitude"
                  type="number"
                  value={editingStation.longitude}
                  onChange={(e) => setEditingStation({ ...editingStation, longitude: e.target.value })}
                  required
                  fullWidth
                  slotProps={{ htmlInput: { step: 'any' } }}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Capacity (kW/h)"
                  type="number"
                  value={editingStation.capacityKwh}
                  onChange={(e) => setEditingStation({ ...editingStation, capacityKwh: e.target.value })}
                  required
                  fullWidth
                  slotProps={{ htmlInput: { step: 'any' } }}
                />
                <TextField
                  label="Battery Storage Slots"
                  type="number"
                  value={editingStation.totalSlots}
                  onChange={(e) => setEditingStation({ ...editingStation, totalSlots: e.target.value })}
                  required
                  fullWidth
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="secondary" onClick={() => setEditingStation(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
>>>>>>> 029e1eb (Unify web/mobile UI with Material Design 3)
      )}

      {/* Slot management dialog */}
      {selectedStationForSlots && (
        <Dialog open onClose={() => setSelectedStationForSlots(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ pr: 7 }}>
            Battery Slot Schedules
            <Typography variant="body2" color="text.secondary">
              {selectedStationForSlots.name} ({selectedStationForSlots.totalSlots} max physical bays)
            </Typography>
            <IconButton
              aria-label="Close"
              onClick={() => setSelectedStationForSlots(null)}
              sx={{ position: 'absolute', right: 12, top: 12 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {slotError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {slotError}
              </Alert>
            )}

            {/* Add or edit slot form */}
            <Box component="form" onSubmit={handleSaveSlot} sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: '#F8FAFC' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                {editingSlotId ? 'Edit Time Window' : 'Open New Booking Window'}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  alignItems: 'center',
                  gridTemplateColumns: { xs: '1fr', md: '2fr 2fr 1fr auto' },
                }}
              >
                <TextField
                  label="Start Time"
                  type="datetime-local"
                  size="small"
                  value={slotForm.startTime}
                  onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="End Time"
                  type="datetime-local"
                  size="small"
                  value={slotForm.endTime}
                  onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Available Bays"
                  type="number"
                  size="small"
                  value={slotForm.totalSlots}
                  onChange={(e) => setSlotForm({ ...slotForm, totalSlots: e.target.value })}
                  required
                  slotProps={{ htmlInput: { min: 1, max: selectedStationForSlots.totalSlots } }}
                />
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained">
                    {editingSlotId ? 'Update' : 'Open'}
                  </Button>
                  {editingSlotId && (
                    <Button color="secondary" onClick={cancelEditSlot}>
                      Cancel
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* Existing slots */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Configured Slots
            </Typography>
            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Window Start</TableCell>
                    <TableCell>Window End</TableCell>
                    <TableCell>Bays Offered</TableCell>
                    <TableCell>Live Available</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slots.map((slot) => {
                    const isPast = new Date(slot.endTime) < new Date();
                    return (
                      <TableRow key={slot.id} hover sx={isPast ? { '& td': { color: 'text.secondary' } } : undefined}>
                        <TableCell>{new Date(slot.startTime).toLocaleString()}</TableCell>
                        <TableCell>{new Date(slot.endTime).toLocaleString()}</TableCell>
                        <TableCell>{slot.totalSlots} bays</TableCell>
                        <TableCell>
                          <StatusChip
                            label={`${slot.availableSlots} free`}
                            tone={slot.availableSlots > 0 ? 'success' : 'danger'}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusChip label={isPast ? 'Expired' : 'Open'} tone={isPast ? 'neutral' : 'info'} />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Button size="small" onClick={() => startEditSlot(slot)}>
                            Edit
                          </Button>
                          <Button size="small" color="error" onClick={() => handleDeleteSlot(slot.id)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {slots.length === 0 && <EmptyRow colSpan={6} text="No booking windows scheduled for this station." />}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => setSelectedStationForSlots(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
<<<<<<< HEAD
    </MapsProvider>
=======

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </>
>>>>>>> 029e1eb (Unify web/mobile UI with Material Design 3)
  );
}
