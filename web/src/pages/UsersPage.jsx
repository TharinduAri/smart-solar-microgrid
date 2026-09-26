// Web user management - Backoffice creates Backoffice and Grid Operator accounts.
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { api } from '../api/client.js';
import EmptyRow from '../components/EmptyRow.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusChip from '../components/StatusChip.jsx';

const emptyForm = { fullName: '', email: '', phoneNumber: '', role: 'GridOperator', password: '' };

const ROLE_LABELS = { Backoffice: 'Backoffice', GridOperator: 'Grid Operator' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  // Loads the two web roles, leaving prosumers to their own screen.
  async function load() {
    setError('');
    try {
      const [backoffice, operators] = await Promise.all([
        api.get('/api/users?role=Backoffice'),
        api.get('/api/users?role=GridOperator'),
      ]);
      setUsers([...backoffice, ...operators]);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Creates a web user through the API.
  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/api/users', form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Web Users" subtitle="Backoffice officers and Grid Operators who use this portal" />

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" component="h2" sx={{ mb: 2 }}>
            Create a Backoffice or Grid Operator account
          </Typography>
          <Box component="form" onSubmit={handleCreate}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '3fr 3fr 2fr 2fr 2fr' },
              }}
            >
              <TextField
                label="Full name"
                size="small"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
              <TextField
                label="Email"
                type="email"
                size="small"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <TextField
                label="Phone"
                size="small"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              />
              <TextField
                select
                label="Role"
                size="small"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <MenuItem value="GridOperator">Grid Operator</MenuItem>
                <MenuItem value="Backoffice">Backoffice</MenuItem>
              </TextField>
              <TextField
                label="Password"
                type="password"
                size="small"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Box>
            <Button type="submit" variant="contained" startIcon={<PersonAddIcon />} sx={{ mt: 2 }}>
              Create user
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={ROLE_LABELS[u.role] ?? u.role} />
                  </TableCell>
                  <TableCell>
                    <StatusChip label={u.isActive ? 'Active' : 'Inactive'} tone={u.isActive ? 'success' : 'neutral'} />
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && <EmptyRow colSpan={4} text="No web users found." />}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
