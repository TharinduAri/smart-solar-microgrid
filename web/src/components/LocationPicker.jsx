// Google Maps location picker used when registering or editing a microgrid node.
// A small preview sits in the form; clicking it opens a large map where the user
// clicks (or drags the pin) to choose the spot, then confirms it. The latitude and
// longitude fields stay editable so the page still works without a Maps API key.
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  Map as GoogleMap,
  Pin,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { tokens } from '../theme.js';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
// Advanced markers need a map id; Google's DEMO_MAP_ID is fine for development.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// Centre of Sri Lanka, shown before a position has been chosen.
const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 };
const DEFAULT_ZOOM = 7;
const PICKED_ZOOM = 14;

// Loads the Maps JavaScript API once for everything inside it, when a key is set.
export function MapsProvider({ children }) {
  if (!MAPS_API_KEY) return children;
  return <APIProvider apiKey={MAPS_API_KEY}>{children}</APIProvider>;
}

// Turns the two form values into a { lat, lng } pair, or null when not a valid position.
function toPosition(latitude, longitude) {
  if (latitude === '' || longitude === '' || latitude == null || longitude == null) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Six decimal places is roughly 10 cm - more than enough for a grid hub.
const round = (value) => Number(value.toFixed(6));

// Map pin in the app's solar amber, matching the Android node map.
function BrandPin() {
  return <Pin background={tokens.brand} borderColor={tokens.brandStrong} glyphColor={tokens.navy} />;
}

// Pans the map to a position chosen outside it (typed in, or from the browser location).
function FollowPosition({ position }) {
  const map = useMap();
  const lat = position?.lat;
  const lng = position?.lng;
  useEffect(() => {
    if (!map || lat === undefined) return;
    const bounds = map.getBounds();
    if (!bounds || !bounds.contains({ lat, lng })) map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
}

// Explains a failed script load, which is almost always a key or billing problem.
function LoadError() {
  const status = useApiLoadingStatus();
  if (status !== APILoadingStatus.FAILED && status !== APILoadingStatus.AUTH_FAILURE) return null;
  return (
    <Alert severity="warning" sx={{ m: 2 }}>
      Google Maps could not be loaded. Check VITE_GOOGLE_MAPS_API_KEY and that the Maps JavaScript API is
      enabled for it. You can still type the coordinates.
    </Alert>
  );
}

// Asks the browser for the current position, handy when registering a hub on site.
function locateWithBrowser(onFound, onError) {
  if (!navigator.geolocation) {
    onError('This browser cannot share its location.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (result) => onFound(result.coords.latitude, result.coords.longitude),
    (err) => onError(err.message || 'Could not read your location.'),
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

// Non-interactive thumbnail of the chosen spot; clicking it opens the large picker.
function MapPreview({ position, onOpen }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      aria-label="Open the map to choose the location"
      sx={{
        position: 'relative',
        display: 'block',
        width: '100%',
        height: 140,
        p: 0,
        border: `1px solid ${tokens.outline}`,
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        bgcolor: tokens.divider,
        transition: 'border-color 120ms, box-shadow 120ms',
        '&:hover, &:focus-visible': {
          borderColor: tokens.brandStrong,
          boxShadow: `0 0 0 3px ${tokens.brandSoft}`,
          outline: 'none',
        },
      }}
    >
      <GoogleMap
        mapId={MAP_ID}
        center={position ?? DEFAULT_CENTER}
        zoom={position ? PICKED_ZOOM - 2 : DEFAULT_ZOOM - 1}
        disableDefaultUI
        gestureHandling="none"
        keyboardShortcuts={false}
        clickableIcons={false}
      >
        {position && (
          <AdvancedMarker position={position}>
            <BrandPin />
          </AdvancedMarker>
        )}
      </GoogleMap>
      <Box
        component="span"
        sx={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.25,
          py: 0.5,
          borderRadius: 999,
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 500,
          pointerEvents: 'none',
        }}
      >
        <OpenInFullIcon sx={{ fontSize: 14 }} />
        {position ? 'Change on map' : 'Choose on map'}
      </Box>
    </Box>
  );
}

// Large map dialog. Works on a draft position and only reports it when confirmed.
function MapDialog({ initialPosition, onConfirm, onClose }) {
  const [draft, setDraft] = useState(initialPosition);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const setDraftFrom = (lat, lng) => setDraft({ lat: round(lat), lng: round(lng) });

  function locateMe() {
    setGeoError('');
    setLocating(true);
    locateWithBrowser(
      (lat, lng) => {
        setLocating(false);
        setDraftFrom(lat, lng);
      },
      (message) => {
        setLocating(false);
        setGeoError(message);
      },
    );
  }

  // MUI stacks this dialog above the Edit Node dialog and closes it on Escape.
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pr: 7 }}>
        Choose the hub location
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <LoadError />
        <Box sx={{ height: '65vh', minHeight: 320 }}>
          <GoogleMap
            mapId={MAP_ID}
            defaultCenter={initialPosition ?? DEFAULT_CENTER}
            defaultZoom={initialPosition ? PICKED_ZOOM : DEFAULT_ZOOM}
            gestureHandling="greedy"
            streetViewControl={false}
            mapTypeControl={false}
            clickableIcons={false}
            onClick={(event) => {
              const latLng = event.detail.latLng;
              if (latLng) setDraftFrom(latLng.lat, latLng.lng);
            }}
          >
            {draft && (
              <AdvancedMarker
                position={draft}
                draggable
                onDragEnd={(event) => {
                  if (event.latLng) setDraftFrom(event.latLng.lat(), event.latLng.lng());
                }}
              >
                <BrandPin />
              </AdvancedMarker>
            )}
            <FollowPosition position={draft} />
          </GoogleMap>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}
        disableSpacing
      >
        <Box sx={{ minWidth: 0 }}>
          {draft ? (
            <Typography variant="body2" sx={{ fontFamily: tokens.mono }}>
              {draft.lat}, {draft.lng}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Click the map to place the hub, then drag the pin to fine-tune it.
            </Typography>
          )}
          {geoError && (
            <Typography variant="caption" color="error">
              {geoError}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<MyLocationIcon />}
            onClick={locateMe}
            disabled={locating}
          >
            {locating ? 'Locating...' : 'Use my location'}
          </Button>
          <Button color="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!draft} onClick={() => onConfirm(draft)}>
            Use this location
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

export default function LocationPicker({ latitude, longitude, onChange }) {
  const position = toPosition(latitude, longitude);
  const [open, setOpen] = useState(false);

  // Side by side when the form is wide, stacked in narrow places such as the Edit dialog.
  return (
    <Box sx={{ containerType: 'inline-size' }}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: '1fr',
          '@container (min-width: 720px)': MAPS_API_KEY
            ? { gridTemplateColumns: 'minmax(280px, 380px) minmax(0, 1fr)', alignItems: 'start' }
            : {},
        }}
      >
        {MAPS_API_KEY ? (
          <MapPreview position={position} onOpen={() => setOpen(true)} />
        ) : (
          <Alert severity="info" icon={<MapOutlinedIcon fontSize="small" />}>
            Map picker is off: set VITE_GOOGLE_MAPS_API_KEY in web/.env to enable it. Enter the coordinates manually.
          </Alert>
        )}

        <Stack spacing={1}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Latitude"
              type="number"
              size="small"
              fullWidth
              value={latitude}
              onChange={(e) => onChange({ latitude: e.target.value, longitude })}
              required
              slotProps={{ htmlInput: { step: 'any', min: -90, max: 90 } }}
            />
            <TextField
              label="Longitude"
              type="number"
              size="small"
              fullWidth
              value={longitude}
              onChange={(e) => onChange({ latitude, longitude: e.target.value })}
              required
              slotProps={{ htmlInput: { step: 'any', min: -180, max: 180 } }}
            />
          </Stack>
          {MAPS_API_KEY && (
            <Typography variant="caption" color="text.secondary">
              Click the map to pick the hub's position, or type the coordinates.
            </Typography>
          )}
        </Stack>
      </Box>

      {open && (
        <MapDialog
          initialPosition={position}
          onClose={() => setOpen(false)}
          onConfirm={(picked) => {
            onChange({ latitude: picked.lat, longitude: picked.lng });
            setOpen(false);
          }}
        />
      )}
    </Box>
  );
}
