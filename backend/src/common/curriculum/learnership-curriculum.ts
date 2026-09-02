/** QCTO / SDP learnership curriculum — mirrored for backend materials service. */

export const ARTIFACT_LABELS: Record<string, string> = {
  'facilitator-guide': 'Facilitator Guide',
  'summative-memo': 'Summative Assessment Memo',
  'learner-guide': 'Learner Guide',
  'learner-workbook': 'Learner Workbook',
  summative: 'Summative Assessment',
  'practical-guide': 'Practical Module Guide',
  'practical-workbook': 'Practical Workbook / Logbook',
  'practical-assessment': 'Practical Assessment / Checklist',
  'workplace-guide': 'Workplace Module Guide',
  'workplace-logbook': 'Workplace Logbook',
  'workplace-assessment': 'Workplace Assessment',
  other: '—',
  na: '—',
};

export function detectModuleFamily(moduleCode?: string | null): 'KM' | 'PM' | 'WM' | null {
  const code = (moduleCode ?? '').trim().toUpperCase();
  if (code.startsWith('KM-')) return 'KM';
  if (code.startsWith('PM-')) return 'PM';
  if (code.startsWith('WM-')) return 'WM';
  return null;
}

export function defaultPoeComponentForSlug(
  slug: string,
  moduleCode?: string | null,
): string {
  const family = detectModuleFamily(moduleCode);
  if (family === 'PM') return 'Practical';
  if (family === 'WM') return 'Workplace';
  switch (slug) {
    case 'facilitator-guide':
    case 'learner-guide':
      return 'Knowledge';
    case 'summative-memo':
    case 'learner-workbook':
    case 'summative':
      return 'Assessment';
    case 'practical-guide':
    case 'practical-workbook':
    case 'practical-assessment':
      return 'Practical';
    case 'workplace-guide':
    case 'workplace-logbook':
    case 'workplace-assessment':
      return 'Workplace';
    default:
      return 'Knowledge';
  }
}

export const KM_ARTIFACT_SLUGS = [
  'facilitator-guide',
  'summative-memo',
  'learner-guide',
  'learner-workbook',
  'summative',
] as const;

export const PM_ARTIFACT_SLUGS = [
  'practical-guide',
  'practical-workbook',
  'practical-assessment',
] as const;

export const WM_ARTIFACT_SLUGS = [
  'workplace-guide',
  'workplace-logbook',
  'workplace-assessment',
] as const;

export type ModuleFamily = 'KM' | 'PM' | 'WM';

export function requiredSlugsForFamily(family: ModuleFamily): string[] {
  switch (family) {
    case 'KM':
      return [...KM_ARTIFACT_SLUGS];
    case 'PM':
      return [...PM_ARTIFACT_SLUGS];
    case 'WM':
      return [...WM_ARTIFACT_SLUGS];
  }
}
