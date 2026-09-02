export type AuthPortal = 'lms' | 'ops';

export const LMS_AUTH_STORAGE_KEY = 'skillforge_auth_v1';
export const OPS_AUTH_STORAGE_KEY = 'skillforge_ops_auth_v1';

let activePortal: AuthPortal =
  (import.meta.env.VITE_AUTH_PORTAL as AuthPortal | undefined) === 'ops'
    ? 'ops'
    : 'lms';

export function configureAuthPortal(portal: AuthPortal) {
  activePortal = portal;
}

export function getAuthPortal(): AuthPortal {
  return activePortal;
}

export function getAuthStorageKey(): string {
  return activePortal === 'ops' ? OPS_AUTH_STORAGE_KEY : LMS_AUTH_STORAGE_KEY;
}

export function getLmsUrl(): string {
  return (
    (import.meta.env.VITE_LMS_URL as string | undefined)?.trim() ||
    'http://localhost:5176'
  );
}

export function getOpsUrl(): string {
  return (
    (import.meta.env.VITE_OPS_URL as string | undefined)?.trim() ||
    'http://localhost:5177'
  );
}
