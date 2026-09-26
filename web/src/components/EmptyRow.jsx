// Placeholder row shown when a table has no data.
import { TableCell, TableRow } from '@mui/material';

export default function EmptyRow({ colSpan, text }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 4, color: 'text.secondary' }}>
        {text}
      </TableCell>
    </TableRow>
  );
}
