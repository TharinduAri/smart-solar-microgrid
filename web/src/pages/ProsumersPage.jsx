// Prosumer management - approves pending activations, edits profiles, and handles deactivations.
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../api/client.js';
import EmptyRow from '../components/EmptyRow.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusChip from '../components/StatusChip.jsx';
import { tokens, tones } from '../theme.js';

export default function ProsumersPage() {
  const [prosumers, setProsumers] = useState([]);
  const [filterTab, setFilterTab] = useState('all'); // all | pending | active | deactivationRequested
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProsumer, setEditingProsumer] = useState(null);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [success, setSuccess] = useState('');

  // Loads every prosumer account registered from the mobile application.
  async function load() {
    setError('');
    try {
      setProsumers(await api.get('/api/users?role=Prosumer'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Activates or deactivates an account - reactivation is Backoffice only.
  async function setActive(prosumer, active) {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/users/${prosumer.id}/${active ? 'activate' : 'deactivate'}`);
      setSuccess(`Account ${prosumer.nic} (${prosumer.fullName}) ${active ? 'activated' : 'deactivated'}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Updates prosumer profile details (name, email, phone, address).
  async function handleUpdateProfile(e) {
    e.preventDefault();
    setModalError('');
    try {
      await api.put(`/api/users/${editingProsumer.id}`, {
        fullName: editingProsumer.fullName.trim(),
        email: editingProsumer.email.trim(),
        phoneNumber: editingProsumer.phoneNumber?.trim() || null,
        address: editingProsumer.address?.trim() || null,
      });
      setEditingProsumer(null);
      setSuccess('Prosumer profile updated successfully.');
      load();
    } catch (err) {
      setModalError(err.message);
    }
  }

  const pendingCount = prosumers.filter((p) => !p.isActive).length;
  const deactivationCount = prosumers.filter((p) => p.deactivationRequested).length;

  const filteredProsumers = prosumers.filter((p) => {
    if (filterTab === 'pending' && p.isActive) return false;
    if (filterTab === 'active' && !p.isActive) return false;
    if (filterTab === 'deactivationRequested' && !p.deactivationRequested) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesNic = p.nic?.toLowerCase().includes(q);
      const matchesName = p.fullName?.toLowerCase().includes(q);
      const matchesEmail = p.email?.toLowerCase().includes(q);
      return matchesNic || matchesName || matchesEmail;
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title="Solar Prosumer Accounts"
        subtitle="Prosumers register via mobile using their National Identity Card (NIC)"
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

      <Card>
        {/* Tabs and search */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{
            px: 2,
            py: { xs: 2, md: 1 },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tabs
            value={filterTab}
            onChange={(event, value) => setFilterTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            textColor="inherit"
          >
            <Tab value="all" label={`All (${prosumers.length})`} />
            <Tab value="pending" label={<CountLabel text="Pending Activation" count={pendingCount} tone="danger" />} />
            <Tab value="active" label={`Active (${prosumers.filter((p) => p.isActive).length})`} />
            {(deactivationCount > 0 || filterTab === 'deactivationRequested') && (
              <Tab value="deactivationRequested" label={`Deactivation Requests (${deactivationCount})`} />
            )}
          </Tabs>
          <TextField
            size="small"
            placeholder="Search by NIC, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: { md: 300 } }}
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
        </Stack>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>NIC (Primary Key)</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProsumers.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontFamily: tokens.mono, fontWeight: 500 }}>{p.nic}</TableCell>
                  <TableCell>{p.fullName}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{p.phoneNumber ?? '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{p.address ?? '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      {p.isActive ? (
                        <StatusChip label="Active" tone="success" />
                      ) : (
                        <StatusChip label="Pending Activation" tone="warning" />
                      )}
                      {p.deactivationRequested && <StatusChip label="Deactivation Requested" tone="danger" />}
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setEditingProsumer({ ...p })} sx={{ mr: 1 }}>
                      Edit
                    </Button>
                    {p.isActive ? (
                      <Button size="small" variant="outlined" color="error" onClick={() => setActive(p, false)}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button size="small" variant="contained" onClick={() => setActive(p, true)}>
                        Activate Account
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredProsumers.length === 0 && (
                <EmptyRow colSpan={7} text="No prosumer accounts found matching the criteria." />
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Edit prosumer dialog */}
      {editingProsumer && (
        <Dialog
          open
          onClose={() => setEditingProsumer(null)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { component: 'form', onSubmit: handleUpdateProfile } }}
        >
          <DialogTitle>Edit Prosumer Profile</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {modalError && <Alert severity="error">{modalError}</Alert>}
              <TextField
                label="NIC (Read Only)"
                value={editingProsumer.nic}
                disabled
                fullWidth
                slotProps={{ htmlInput: { style: { fontFamily: tokens.mono } } }}
              />
              <TextField
                label="Full Name"
                value={editingProsumer.fullName}
                onChange={(e) => setEditingProsumer({ ...editingProsumer, fullName: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={editingProsumer.email}
                onChange={(e) => setEditingProsumer({ ...editingProsumer, email: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Phone Number"
                value={editingProsumer.phoneNumber ?? ''}
                onChange={(e) => setEditingProsumer({ ...editingProsumer, phoneNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="Address"
                value={editingProsumer.address ?? ''}
                onChange={(e) => setEditingProsumer({ ...editingProsumer, address: e.target.value })}
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="secondary" onClick={() => setEditingProsumer(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save Profile
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

// Tab label with a small count badge, shown only when the count is above zero.
function CountLabel({ text, count, tone }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {text}
      {count > 0 && (
        <Chip size="small" label={count} sx={{ height: 20, bgcolor: tones[tone].bg, color: tones[tone].fg }} />
      )}
    </Box>
  );
}
