// Material confirmation dialog used before destructive actions, like the Android app's confirm dialogs.
import { useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

export default function ConfirmDialog({ request, onClose }) {
  // Keeps the last request so the text stays visible while the dialog fades out.
  const lastRequest = useRef(request);
  if (request) lastRequest.current = request;
  const shown = request ?? lastRequest.current;

  // Closes the dialog and runs the confirmed action.
  function handleConfirm() {
    onClose();
    request.onConfirm();
  }

  return (
    <Dialog open={Boolean(request)} onClose={onClose} maxWidth="xs" fullWidth>
      {shown && (
        <>
          <DialogTitle>{shown.title}</DialogTitle>
          {shown.message && (
            <DialogContent>
              <DialogContentText>{shown.message}</DialogContentText>
            </DialogContent>
          )}
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="secondary" onClick={onClose}>
              {shown.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant="contained" color="error" onClick={handleConfirm}>
              {shown.confirmLabel}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
