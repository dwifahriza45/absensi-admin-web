import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { GeoLocation } from "@/types";
import type { AttendanceRow } from "@/utils/attendanceRows";
import { formatDayShort, formatTime } from "@/utils/date";

const TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const DEFAULT_CENTER: L.LatLngTuple = [-6.92, 106.93];
const NAVY = "#16306A";
const RED = "#B3122E";

export interface AttendanceMapHandle {
  flyTo: (location: GeoLocation) => void;
}

interface AttendanceMapProps {
  rows: AttendanceRow[];
  selectedKey: string | null;
  caption: string;
  onSelect: (row: AttendanceRow) => void;
}

/** Peta lokasi absen masuk. Titik terpilih berwarna merah; `flyTo` menganimasikan zoom. */
export const AttendanceMap = forwardRef<
  AttendanceMapHandle,
  AttendanceMapProps
>(function AttendanceMap({ rows, selectedKey, caption, onSelect }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useImperativeHandle(ref, () => ({
    flyTo: (location) =>
      mapRef.current?.flyTo([location.lat, location.lng], 18, {
        duration: 1.8,
        easeLinearity: 0.2,
      }),
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 12);
    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      maxNativeZoom: 18,
      attribution: "Tiles © Esri",
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points = rows.filter((row) => row.record?.checkInLocation);
    for (const row of points) {
      const location = row.record!.checkInLocation!;
      const selected = row.key === selectedKey;
      const point: L.LatLngTuple = [location.lat, location.lng];

      L.circleMarker(point, {
        radius: selected ? 11 : 8,
        color: "#fff",
        weight: 3,
        fillColor: selected ? RED : NAVY,
        fillOpacity: 1,
      })
        .bindTooltip(
          `${row.employee.name} · ${formatDayShort(row.date)} ${formatTime(row.record!.checkInAt)}`,
        )
        .on("click", () => onSelectRef.current(row))
        .addTo(layer);

      if (selected) {
        L.circle(point, {
          radius: location.accuracyM,
          color: RED,
          weight: 1,
          fillOpacity: 0.1,
        }).addTo(layer);
      }
    }

    if (!selectedKey && points.length) {
      const bounds = L.latLngBounds(
        points.map((row) => [
          row.record!.checkInLocation!.lat,
          row.record!.checkInLocation!.lng,
        ]),
      );
      map.fitBounds(bounds.pad(0.3), { maxZoom: 16 });
    }
  }, [rows, selectedKey]);

  return (
    <div className="map">
      <div ref={containerRef} className="map__canvas" />
      <span className="map__caption">{caption}</span>
    </div>
  );
});
