// Google Maps location picker used when registering or editing a microgrid node.
// A small preview sits in the form; clicking it opens a large map where the user
// clicks (or drags the pin) to choose the spot, then confirms it. The latitude and
// longitude fields stay editable so the page still works without a Maps API key.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  Map as GoogleMap,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';

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
    <div className="alert alert-warning py-2 small mb-2">
      Google Maps could not be loaded. Check VITE_GOOGLE_MAPS_API_KEY and that the Maps JavaScript API is
      enabled for it. You can still type the coordinates.
    </div>
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
    <button
      type="button"
      className="ss-map-preview"
      onClick={onOpen}
      aria-label="Open the map to choose the location"
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
        {position && <AdvancedMarker position={position} />}
      </GoogleMap>
      <span className="ss-map-preview-label">
        <i className="bi bi-arrows-fullscreen me-1" />
        {position ? 'Change on map' : 'Choose on map'}
      </span>
    </button>
  );
}

// Large map dialog. Works on a draft position and only reports it when confirmed.
function MapDialog({ initialPosition, onConfirm, onClose }) {
  const [draft, setDraft] = useState(initialPosition);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Escape closes the dialog without changing the form.
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  // Rendered on <body> so it sits above the Edit Node modal as well.
  return createPortal(
    <div className="modal show d-block ss-map-dialog" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow">
          <div className="modal-header py-2">
            <h5 className="modal-title h6 mb-0">Choose the hub location</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body p-0">
            <LoadError />
            <div style={{ height: '65vh' }}>
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
                  />
                )}
                <FollowPosition position={draft} />
              </GoogleMap>
            </div>
          </div>
          <div className="modal-footer justify-content-between py-2">
            <div className="small text-muted">
              {draft ? (
                <span className="font-monospace">
                  {draft.lat}, {draft.lng}
                </span>
              ) : (
                'Click the map to place the hub, then drag the pin to fine-tune it.'
              )}
              {geoError && <div className="text-danger">{geoError}</div>}
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={locateMe} disabled={locating}>
                <i className="bi bi-crosshair me-1" />
                {locating ? 'Locating...' : 'Use my location'}
              </button>
              <button type="button" className="btn btn-sm btn-light" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-warning fw-semibold"
                disabled={!draft}
                onClick={() => onConfirm(draft)}
              >
                Use this location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function LocationPicker({ latitude, longitude, onChange }) {
  const position = toPosition(latitude, longitude);
  const [open, setOpen] = useState(false);

  return (
    <div className="row g-2 align-items-stretch">
      {MAPS_API_KEY ? (
        <div className="col-12 col-md-5 col-lg-4">
          <MapPreview position={position} onOpen={() => setOpen(true)} />
        </div>
      ) : (
        <div className="col-12">
          <div className="alert alert-secondary py-2 small mb-0">
            <i className="bi bi-map me-1" />
            Map picker is off: set VITE_GOOGLE_MAPS_API_KEY in web/.env to enable it. Enter the coordinates manually.
          </div>
        </div>
      )}

      <div className="col-12 col-md d-flex flex-column justify-content-end">
        <div className="row g-2">
          <div className="col-6">
            <label className="form-label small text-muted mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              className="form-control form-control-sm"
              value={latitude}
              onChange={(e) => onChange({ latitude: e.target.value, longitude })}
              required
            />
          </div>
          <div className="col-6">
            <label className="form-label small text-muted mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              className="form-control form-control-sm"
              value={longitude}
              onChange={(e) => onChange({ latitude, longitude: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

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
    </div>
  );
}
