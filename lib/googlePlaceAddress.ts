import type { CustomerAddress } from "@minute-menus/types";
import type { GoogleAddressComponent, GooglePlaceResult } from "./loadGoogleMaps";
import { loadGoogleMaps } from "./loadGoogleMaps";

function component(components: GoogleAddressComponent[] | undefined, type: string, short = false): string {
  const hit = components?.find((c) => c.types.includes(type));
  if (!hit) return "";
  return (short ? hit.short_name : hit.long_name).trim();
}

/** Map a Google Place / Geocoder result into our customer address fields. */
export function placeResultToAddress(place: GooglePlaceResult): CustomerAddress {
  const parts = place.address_components ?? [];
  const streetNumber = component(parts, "street_number");
  const route = component(parts, "route");
  const premise = component(parts, "premise") || component(parts, "subpremise");
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  const area =
    component(parts, "sublocality_level_1")
    || component(parts, "sublocality")
    || component(parts, "neighborhood")
    || component(parts, "administrative_area_level_2");
  const city = component(parts, "locality") || component(parts, "administrative_area_level_2");
  const state = component(parts, "administrative_area_level_1");
  const pincode = component(parts, "postal_code");
  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();

  return {
    addressLine1: premise || street || place.formatted_address?.split(",")[0]?.trim() || undefined,
    street: street || undefined,
    area: area || undefined,
    city: city || undefined,
    state: state || undefined,
    pincode: pincode || undefined,
    lat: typeof lat === "number" ? lat : undefined,
    lng: typeof lng === "number" ? lng : undefined,
    formattedAddress: place.formatted_address?.trim() || undefined,
  };
}

export async function fetchPlaceDetails(placeId: string): Promise<CustomerAddress> {
  const maps = await loadGoogleMaps();
  const service = new maps.places.PlacesService(document.createElement("div"));
  return new Promise((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: ["address_components", "formatted_address", "geometry"],
      },
      (place, status) => {
        if (status !== maps.places.PlacesServiceStatus.OK || !place) {
          reject(new Error("Could not load that place. Try another search."));
          return;
        }
        resolve(placeResultToAddress(place));
      },
    );
  });
}

export async function searchPlacePredictions(input: string): Promise<Array<{ description: string; placeId: string }>> {
  const q = input.trim();
  if (q.length < 3) return [];
  const maps = await loadGoogleMaps();
  const service = new maps.places.AutocompleteService();
  return new Promise((resolve, reject) => {
    service.getPlacePredictions(
      { input: q, componentRestrictions: { country: "in" } },
      (preds, status) => {
        if (status === maps.places.PlacesServiceStatus.OK && preds) {
          resolve(preds.map((p) => ({ description: p.description, placeId: p.place_id })));
          return;
        }
        if (status === "ZERO_RESULTS") {
          resolve([]);
          return;
        }
        if (status === "REQUEST_DENIED") {
          reject(new Error("Google Places denied this key. Enable Places API and check key restrictions."));
          return;
        }
        reject(new Error(`Place search failed (${status}). Try again or enter manually.`));
      },
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<CustomerAddress> {
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== maps.GeocoderStatus.OK || !results?.[0]) {
        reject(new Error("Could not resolve your location. Enter the address manually."));
        return;
      }
      resolve(placeResultToAddress(results[0]));
    });
  });
}

export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Location is not supported on this device."));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied. Allow location or search with Google."));
          return;
        }
        reject(new Error("Could not get current location. Try again or search with Google."));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  });
}
