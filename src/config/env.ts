const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

/** Base URL without trailing slash. Defaults to Nest dev server (`backend` PORT 8787). */
export const API_BASE_URL = (raw || 'http://localhost:8787').replace(/\/$/, '');

/** Kept for incremental migration; always true when using default API URL. */
export const HAS_REMOTE_API = API_BASE_URL.length > 0;
