import type { ProgrammeKind } from '../types';

export const PROGRAMME_KIND_LABELS: Record<ProgrammeKind, string> = {
  SKILLS_PROGRAMME: 'Skills programme',
  OCCUPATIONAL_PROGRAMME: 'Occupational programme',
};

/** Shared PoE rule copy — applies to both programme kinds */
export const PROGRAMME_POE_ARTIFACTS_NOTE =
  'Each Knowledge Module (KM) includes Facilitator Guide, Summative Memo, Learner Guide, Learner Workbook, and Summative Assessment. Practical (PM) and Workplace (WM) modules carry their own evidence sets where the qualification requires them.';
