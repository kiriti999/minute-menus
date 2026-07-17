/**
 * Build a Google Maps URL from a pin/share link or free-text place query.
 */
export function googleMapsUrl(mapsUrlOrQuery: string): string | null {
	const trimmed = mapsUrlOrQuery.trim();
	if (!trimmed) return null;
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

/** Prefer an explicit Maps pin URL; otherwise search by location label. */
export function jobFlyerMapsTarget(locationText?: string, mapsUrl?: string): string | null {
	const fromUrl = mapsUrl?.trim() ? googleMapsUrl(mapsUrl) : null;
	if (fromUrl) return fromUrl;
	return locationText?.trim() ? googleMapsUrl(locationText) : null;
}
