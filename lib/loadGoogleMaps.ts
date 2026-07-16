/** Loads the Google Maps JS API (Places + Geocoder) once per page. */

const SCRIPT_ID = "mm-google-maps";

type GoogleMapsNs = {
  places: {
    AutocompleteService: new () => {
      getPlacePredictions: (
        req: { input: string; componentRestrictions?: { country: string | string[] } },
        cb: (preds: Array<{ description: string; place_id: string }> | null, status: string) => void,
      ) => void;
    };
    PlacesService: new (el: HTMLElement) => {
      getDetails: (
        req: { placeId: string; fields: string[] },
        cb: (place: GooglePlaceResult | null, status: string) => void,
      ) => void;
    };
    PlacesServiceStatus: { OK: string };
  };
  Geocoder: new () => {
    geocode: (
      req: { location: { lat: number; lng: number } } | { address: string },
      cb: (results: GooglePlaceResult[] | null, status: string) => void,
    ) => void;
  };
  GeocoderStatus: { OK: string };
};

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type GooglePlaceResult = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: { location?: { lat: () => number; lng: () => number } };
};

export function googleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

function mapsNs(): GoogleMapsNs | undefined {
  return (window as unknown as { google?: { maps?: GoogleMapsNs } }).google?.maps;
}

export function loadGoogleMaps(): Promise<GoogleMapsNs> {
  const key = googleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error("Google Maps is not configured (VITE_GOOGLE_MAPS_API_KEY)."));
  }

  const ready = mapsNs();
  if (ready?.places) return Promise.resolve(ready);

  const w = window as unknown as { __mmGoogleMapsPromise?: Promise<GoogleMapsNs> };
  if (w.__mmGoogleMapsPromise) return w.__mmGoogleMapsPromise;

  w.__mmGoogleMapsPromise = new Promise<GoogleMapsNs>((resolve, reject) => {
    const finish = () => {
      const maps = mapsNs();
      if (!maps?.places) {
        reject(new Error("Google Maps failed to initialize"));
        return;
      }
      resolve(maps);
    };

    const prev = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (prev) {
      if (mapsNs()?.places) {
        finish();
        return;
      }
      prev.addEventListener("load", finish, { once: true });
      prev.addEventListener("error", () => reject(new Error("Failed to load Google Maps")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=en&region=IN`;
    script.onload = finish;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return w.__mmGoogleMapsPromise;
}
