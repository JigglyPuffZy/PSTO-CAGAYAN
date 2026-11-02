import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FirmLocation } from '../../types';

const CAGAYAN_CENTER: [number, number] = [18.2466, 121.8733];

const iconCache = new Map<string, L.DivIcon>();

function pinIcon(district: string, selected: boolean): L.DivIcon {
  const key = `${district}-${selected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: 'pg-pin-wrap',
      html: `<span class="pg-pin pg-pin-d${district} ${selected ? 'pg-pin-on' : ''}"><i></i></span>`,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      tooltipAnchor: [14, -26],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

const draftIcon = L.divIcon({
  className: 'pg-pin-wrap',
  html: '<span class="pg-draft"><i></i></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapClickHandler({ enabled, onPick }: { enabled: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Leaflet needs invalidateSize after layout changes; fixes blank/gray tiles. */
function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 120);
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [map]);
  return null;
}

/**
 * Moves the camera only when the *result set* or the focused firm changes — not on every
 * render — so panning, zooming and typing in side forms never snap the map back.
 */
function CameraController({
  points,
  focus,
  fitKey,
}: {
  points: [number, number][];
  focus: { lat: number; lng: number; id: number } | null;
  fitKey: string;
}) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const focusKey = focus ? focus.id : 0;
  const first = useRef(true);

  useEffect(() => {
    // Interrupted flyTo animations can leave Leaflet mid-zoom, so use plain animated
    // view changes and skip animation on the very first placement.
    map.stop();
    map.invalidateSize();
    const animate = !first.current;
    first.current = false;
    const opts = { animate, duration: 0.6 };

    if (focus) {
      map.setView([focus.lat, focus.lng], Math.max(map.getZoom(), 12), opts);
      return;
    }
    const pts = pointsRef.current;
    if (pts.length === 0) map.setView(CAGAYAN_CENTER, 8, opts);
    else if (pts.length === 1) map.setView(pts[0], 12, opts);
    else map.fitBounds(L.latLngBounds(pts), { padding: [70, 70], maxZoom: 12, ...opts });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey, focusKey]);

  return null;
}

export type FirmMapProps = {
  locations: FirmLocation[];
  picked: { lat: number; lng: number } | null;
  selectedId: number | null;
  pickEnabled: boolean;
  onPick: (lat: number, lng: number) => void;
  onView: (loc: FirmLocation) => void;
};

export function FirmMap({ locations, picked, selectedId, pickEnabled, onPick, onView }: FirmMapProps) {
  const markers = useMemo(() => {
    const out: { loc: FirmLocation; lat: number; lng: number }[] = [];
    for (const p of locations) {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) out.push({ loc: p, lat, lng });
    }
    return out;
  }, [locations]);

  const points = useMemo(() => markers.map((m) => [m.lat, m.lng] as [number, number]), [markers]);
  const fitKey = useMemo(() => markers.map((m) => m.loc.id).join(','), [markers]);

  const focus = useMemo(() => {
    const m = markers.find((x) => x.loc.id === selectedId);
    return m ? { lat: m.lat, lng: m.lng, id: m.loc.id } : null;
  }, [markers, selectedId]);

  return (
    <div className={`firm-map-root relative h-full w-full ${pickEnabled ? 'pg-picking' : ''}`}>
      <MapContainer
        center={CAGAYAN_CENTER}
        zoom={8}
        scrollWheelZoom
        zoomControl={false}
        zoomAnimation={false}
        markerZoomAnimation={false}
        className="firm-map-canvas z-0 h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizeFix />
        <MapClickHandler enabled={pickEnabled} onPick={onPick} />
        <CameraController points={points} focus={focus} fitKey={fitKey} />

        {markers.map(({ loc, lat, lng }) => (
          <Marker
            key={loc.id}
            position={[lat, lng]}
            icon={pinIcon(loc.district, loc.id === selectedId)}
            zIndexOffset={loc.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onView(loc) }}
          >
            <Tooltip direction="right" offset={[6, 0]} className="pg-tip">
              {loc.firm}
            </Tooltip>
          </Marker>
        ))}

        {picked && <Marker position={[picked.lat, picked.lng]} icon={draftIcon} interactive={false} />}
      </MapContainer>
    </div>
  );
}
