import { Loader2, LocateFixed, Search } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { CustomerAddress } from "@minute-menus/types";
import {
  fetchPlaceDetails,
  getCurrentPosition,
  reverseGeocode,
  searchPlacePredictions,
} from "../lib/googlePlaceAddress";
import { googleMapsApiKey } from "../lib/loadGoogleMaps";

interface CustomerAddressLocateProps {
  onResolved: (address: CustomerAddress) => void;
  onError?: (message: string) => void;
}

export const CustomerAddressLocate: React.FC<CustomerAddressLocateProps> = ({
  onResolved,
  onError,
}) => {
  const configured = Boolean(googleMapsApiKey());
  const [query, setQuery] = useState("");
  const [preds, setPreds] = useState<Array<{ description: string; placeId: string }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHint, setSearchHint] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!configured) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 3) {
      setPreds([]);
      setSearchHint("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoadingSearch(true);
      setSearchHint("");
      void searchPlacePredictions(q)
        .then((list) => {
          setPreds(list);
          setSearchOpen(list.length > 0);
          setSearchHint(list.length === 0 ? "No places found — try a different search" : "");
        })
        .catch((e) => {
          setPreds([]);
          const msg = e instanceof Error ? e.message : "Place search failed";
          setSearchHint(msg);
          onErrorRef.current?.(msg);
        })
        .finally(() => setLoadingSearch(false));
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, configured]);

  const pickPlace = async (placeId: string, description: string) => {
    setLoadingPlace(true);
    setSearchOpen(false);
    setQuery(description);
    setSearchHint("");
    try {
      const address = await fetchPlaceDetails(placeId);
      onResolved(address);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Could not load place");
    } finally {
      setLoadingPlace(false);
    }
  };

  const useCurrent = async () => {
    if (!configured) {
      onError?.("Google Maps is not configured. Restart the app after setting VITE_GOOGLE_MAPS_API_KEY.");
      return;
    }
    setLoadingCurrent(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      const address = await reverseGeocode(lat, lng);
      onResolved(address);
      if (address.formattedAddress) setQuery(address.formattedAddress);
      setSearchHint("");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Could not use current location");
    } finally {
      setLoadingCurrent(false);
    }
  };

  const busy = loadingPlace || loadingCurrent;

  return (
    <div className="space-y-3 mb-4" ref={wrapRef}>
      {!configured && (
        <p className="text-[11px] text-amber-400/90 leading-snug">
          Google location needs a restart after setting{" "}
          <span className="font-mono text-amber-300">VITE_GOOGLE_MAPS_API_KEY</span> in{" "}
          <span className="font-mono">.env</span>.
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => void useCurrent()}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-emerald-700/80 bg-emerald-950/40 text-[12px] font-bold uppercase tracking-wider text-emerald-100 hover:bg-emerald-950/70 disabled:opacity-50"
      >
        {loadingCurrent ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
        Use current location
      </button>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
          Search on Google
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={query}
            disabled={busy || !configured}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => preds.length > 0 && setSearchOpen(true)}
            placeholder="Type area, building, or landmark…"
            className="w-full bg-zinc-900 border border-zinc-700 text-white pl-9 pr-9 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
            autoComplete="off"
          />
          {(loadingSearch || loadingPlace) && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 animate-spin" />
          )}
          {searchOpen && preds.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 shadow-xl">
              {preds.map((p) => (
                <li key={p.placeId}>
                  <button
                    type="button"
                    onClick={() => void pickPlace(p.placeId, p.description)}
                    className="w-full text-left px-3 py-2.5 text-xs text-zinc-200 hover:bg-zinc-900 border-b border-zinc-800 last:border-0"
                  >
                    {p.description}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {searchHint && (
          <p className="mt-1.5 text-[11px] text-zinc-500 leading-snug">{searchHint}</p>
        )}
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pt-1">
        Or enter address manually
      </p>
    </div>
  );
};
