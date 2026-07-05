export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Tel Aviv — sensible default map center when we have address text but no coords yet. */
export const TEL_AVIV_CENTER: LatLng = {
  latitude: 32.0853,
  longitude: 34.7818,
};

type GeoJsonPoint = {
  type?: string;
  coordinates?: [number, number];
};

/** Parse a PostGIS geography value returned by Supabase (GeoJSON, WKT, or EWKT). */
export function parseGeographyPoint(value: unknown): LatLng | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'object') {
    const point = value as GeoJsonPoint;
    if (point.type === 'Point' && Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
      const [longitude, latitude] = point.coordinates;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const wkt = value.includes(';') ? value.split(';').pop() ?? value : value;
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) {
    return null;
  }

  const longitude = Number.parseFloat(match[1]);
  const latitude = Number.parseFloat(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function toGeographyEwkt({ latitude, longitude }: LatLng): string {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

/** Haversine distance in kilometres between two WGS84 points. */
export function distanceKm(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}
