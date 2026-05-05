import type { User } from '../types';

/** Sidebar: learner profile URL, or undefined when not applicable */
export function resolveLearnerProfilePath(
  user: User | null | undefined,
  linkedLearnerId: string | null,
): string | undefined {
  if (!user || user.role !== 'Learner') return undefined;
  const id = linkedLearnerId ?? user.linkedLearnerId ?? null;
  if (id) return `/learner/${id}`;
  return '/learner-dashboard';
}
