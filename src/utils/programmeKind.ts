import type { ProgrammeKind } from '../types';

export const PROGRAMME_KIND_LABELS: Record<ProgrammeKind, string> = {
  SKILLS_PROGRAMME: 'Skills programme',
  OCCUPATIONAL_PROGRAMME: 'Occupational programme',
};

/** Shared PoE rule copy — applies to both programme kinds */
export const PROGRAMME_POE_ARTIFACTS_NOTE =
  'Every programme includes Learner Workbooks and Summative Assessments for each knowledge module (or equivalent structure).';
