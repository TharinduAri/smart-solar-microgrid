// Small coloured status label. Reservation statuses pick their tone automatically,
// and the colours match the status labels on the Android booking cards.
import { Chip } from '@mui/material';
import { reservationTone, tones } from '../theme.js';

export default function StatusChip({ label, tone }) {
  const colors = tones[tone ?? reservationTone[label] ?? 'neutral'];
  return <Chip size="small" label={label} sx={{ bgcolor: colors.bg, color: colors.fg }} />;
}
