/**
 * Runtime loader for the Google Maps JavaScript API.
 * The key is provided by the user (env var or localStorage) — GlowAtlas
 * ships without one and falls back to open basemaps.
 */

type GoogleMaps = typeof google.maps;

let loading: Promise<GoogleMaps> | null = null;
let pendingReject: ((err: Error) => void) | null = null;
let lateAuthFailure: ((message: string) => void) | null = null;

const AUTH_MSG =
  "Google rejected this API key. Check the key value, its API restrictions and that billing is enabled.";

/** Subscribe to auth failures that surface after the script has loaded. */
export function onGoogleAuthFailure(handler: (message: string) => void): () => void {
  lateAuthFailure = handler;
  return () => {
    if (lateAuthFailure === handler) lateAuthFailure = null;
  };
}

export function loadGoogleMaps(apiKey: string): Promise<GoogleMaps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loading) return loading;

  loading = new Promise<GoogleMaps>((resolve, reject) => {
    let settled = false;
    pendingReject = (err: Error) => {
      if (settled) return;
      settled = true;
      loading = null;
      reject(err);
    };

    // Google calls this global when a key is missing / invalid / unauthorized.
    (window as Window & { gm_authFailure?: () => void }).gm_authFailure = () => {
      pendingReject?.(new Error(AUTH_MSG));
      lateAuthFailure?.(AUTH_MSG);
    };

    const cb = "__glowatlasGmapsReady";
    (window as unknown as Record<string, unknown>)[cb] = () => {
      if (settled) return;
      settled = true;
      resolve(window.google!.maps);
    };

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&callback=${cb}&v=weekly`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      if (settled) return;
      settled = true;
      loading = null;
      reject(new Error("Could not download the Google Maps script — check your network."));
    };
    document.head.appendChild(s);
  });

  return loading;
}
