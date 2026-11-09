export interface CampusLocation {
  id: string;
  organization_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pastor_name?: string;
  is_headquarters?: boolean | number;
  latitude?: number | string | null;
  longitude?: number | string | null;
}
export interface Coordinates { latitude: number; longitude: number }

export function coordinates(value: { latitude?: unknown; longitude?: unknown }): Coordinates | null {
  const valid = (v: unknown) => (typeof v === 'number' || typeof v === 'string') && String(v).trim() !== '';
  if (!valid(value.latitude) || !valid(value.longitude)) return null;
  const latitude = Number(value.latitude), longitude = Number(value.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude } : null;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const radians = (n: number) => n * Math.PI / 180;
  const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function orderCampuses(campuses: CampusLocation[], organizationId: string, member: { organization_id?: string; campus_id?: string } | null, position: Coordinates | null) {
  const homeId = member?.organization_id === organizationId ? member.campus_id : undefined;
  return campuses.filter(c => c.organization_id === organizationId).map(campus => {
    const point = coordinates(campus);
    return { campus, isHome: campus.id === homeId, distance: position && point ? distanceKm(position, point) : null };
  }).sort((a, b) => Number(b.isHome) - Number(a.isHome)
    || (a.distance === null ? Infinity : a.distance) - (b.distance === null ? Infinity : b.distance)
    || a.campus.name.localeCompare(b.campus.name, 'pt-BR', { sensitivity: 'base' })
    || a.campus.id.localeCompare(b.campus.id));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(km)} km`;
}
