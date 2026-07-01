import { SetMetadata } from '@nestjs/common';

/** Marks routes that can be turned off with ADMIN_ENDPOINTS_ENABLED=false */
export const ADMIN_ONLY_ENDPOINT_KEY = 'adminOnlyEndpoint';

export const AdminOnlyEndpoint = () =>
  SetMetadata(ADMIN_ONLY_ENDPOINT_KEY, true);
