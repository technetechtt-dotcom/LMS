/** QCTO / SDP learnership curriculum structure — KM, PM, and WM module families. */

export type ModuleFamily = 'KM' | 'PM' | 'WM';

export type KmArtifactSlug =
  | 'facilitator-guide'
  | 'summative-memo'
  | 'learner-guide'
  | 'learner-workbook'
  | 'summative';

export type PmArtifactSlug =
  | 'practical-guide'
  | 'practical-workbook'
  | 'practical-assessment';

export type WmArtifactSlug =
  | 'workplace-guide'
  | 'workplace-logbook'
  | 'workplace-assessment';

export type CurriculumArtifactSlug =
  | KmArtifactSlug
  | PmArtifactSlug
  | WmArtifactSlug
  | 'other';

export interface CurriculumArtifactDef {
  slug: CurriculumArtifactSlug;
  label: string;
  shortLabel: string;
  family: ModuleFamily | 'other';
  poeComponent: 'Knowledge' | 'Assessment' | 'Practical' | 'Workplace';
  /** Learner submits through PoE workflow (workbook + summative only). */
  learnerWorkflow: boolean;
  audience: 'facilitator' | 'assessor' | 'learner' | 'mentor' | 'staff';
}

export const MODULE_FAMILIES: Record<
  ModuleFamily,
  { prefix: string; label: string; description: string }
> = {
  KM: {
    prefix: 'KM-',
    label: 'Knowledge Module (KM)',
    description:
      'Theory and knowledge outcomes. Each KM ships five standard documents.',
  },
  PM: {
    prefix: 'PM-',
    label: 'Practical Module (PM)',
    description:
      'Simulated or centre-based practical skills, logbooks, and assessments.',
  },
  WM: {
    prefix: 'WM-',
    label: 'Workplace Experience Module (WM)',
    description:
      'Workplace placement evidence, mentor sign-off, and workplace assessments.',
  },
};

/** Five documents per knowledge module. */
export const KM_ARTIFACTS: CurriculumArtifactDef[] = [
  {
    slug: 'facilitator-guide',
    label: 'Facilitator Guide',
    shortLabel: 'Facilitator Guide',
    family: 'KM',
    poeComponent: 'Knowledge',
    learnerWorkflow: false,
    audience: 'facilitator',
  },
  {
    slug: 'summative-memo',
    label: 'Summative Assessment Memo',
    shortLabel: 'Summative Memo',
    family: 'KM',
    poeComponent: 'Assessment',
    learnerWorkflow: false,
    audience: 'assessor',
  },
  {
    slug: 'learner-guide',
    label: 'Learner Guide',
    shortLabel: 'Learner Guide',
    family: 'KM',
    poeComponent: 'Knowledge',
    learnerWorkflow: false,
    audience: 'learner',
  },
  {
    slug: 'learner-workbook',
    label: 'Learner Workbook',
    shortLabel: 'Learner Workbook',
    family: 'KM',
    poeComponent: 'Assessment',
    learnerWorkflow: true,
    audience: 'learner',
  },
  {
    slug: 'summative',
    label: 'Summative Assessment',
    shortLabel: 'Summative Assessment',
    family: 'KM',
    poeComponent: 'Assessment',
    learnerWorkflow: true,
    audience: 'learner',
  },
];

export const PM_ARTIFACTS: CurriculumArtifactDef[] = [
  {
    slug: 'practical-guide',
    label: 'Practical Module Guide',
    shortLabel: 'Practical Guide',
    family: 'PM',
    poeComponent: 'Practical',
    learnerWorkflow: false,
    audience: 'facilitator',
  },
  {
    slug: 'practical-workbook',
    label: 'Practical Workbook / Logbook',
    shortLabel: 'Practical Workbook',
    family: 'PM',
    poeComponent: 'Practical',
    learnerWorkflow: true,
    audience: 'learner',
  },
  {
    slug: 'practical-assessment',
    label: 'Practical Assessment / Checklist',
    shortLabel: 'Practical Assessment',
    family: 'PM',
    poeComponent: 'Practical',
    learnerWorkflow: true,
    audience: 'learner',
  },
];

export const WM_ARTIFACTS: CurriculumArtifactDef[] = [
  {
    slug: 'workplace-guide',
    label: 'Workplace Module Guide',
    shortLabel: 'Workplace Guide',
    family: 'WM',
    poeComponent: 'Workplace',
    learnerWorkflow: false,
    audience: 'mentor',
  },
  {
    slug: 'workplace-logbook',
    label: 'Workplace Logbook',
    shortLabel: 'Workplace Logbook',
    family: 'WM',
    poeComponent: 'Workplace',
    learnerWorkflow: true,
    audience: 'learner',
  },
  {
    slug: 'workplace-assessment',
    label: 'Workplace Assessment',
    shortLabel: 'Workplace Assessment',
    family: 'WM',
    poeComponent: 'Workplace',
    learnerWorkflow: true,
    audience: 'learner',
  },
];

export const ALL_CURRICULUM_ARTIFACTS: CurriculumArtifactDef[] = [
  ...KM_ARTIFACTS,
  ...PM_ARTIFACTS,
  ...WM_ARTIFACTS,
];

export const ARTIFACT_LABELS: Record<string, string> = Object.fromEntries(
  ALL_CURRICULUM_ARTIFACTS.map((a) => [a.slug, a.label]),
);

export function detectModuleFamily(moduleCode?: string | null): ModuleFamily | null {
  const code = (moduleCode ?? '').trim().toUpperCase();
  if (code.startsWith('KM-')) return 'KM';
  if (code.startsWith('PM-')) return 'PM';
  if (code.startsWith('WM-')) return 'WM';
  return null;
}

export function defaultPoeComponentForArtifact(
  slug: string,
  moduleCode?: string | null,
): string {
  const family = detectModuleFamily(moduleCode);
  if (family === 'PM') return 'Practical';
  if (family === 'WM') return 'Workplace';
  const def = ALL_CURRICULUM_ARTIFACTS.find((a) => a.slug === slug);
  if (def) return def.poeComponent;
  if (slug === 'learner-workbook' || slug === 'summative') return 'Assessment';
  if (slug === 'learner-guide') return 'Knowledge';
  return 'Knowledge';
}

export function artifactsForFamily(
  family: ModuleFamily | 'other',
): CurriculumArtifactDef[] {
  switch (family) {
    case 'KM':
      return KM_ARTIFACTS;
    case 'PM':
      return PM_ARTIFACTS;
    case 'WM':
      return WM_ARTIFACTS;
    default:
      return [];
  }
}

export function moduleCodePlaceholder(family: ModuleFamily): string {
  return `${MODULE_FAMILIES[family].prefix}01`;
}

export function titleExample(
  family: ModuleFamily,
  artifactSlug: string,
): string {
  const def = ALL_CURRICULUM_ARTIFACTS.find((a) => a.slug === artifactSlug);
  const label = def?.shortLabel ?? 'Document';
  return `${MODULE_FAMILIES[family].prefix}01-${label}`;
}

export const LEARNERSHIP_STRUCTURE_SUMMARY =
  'Every learnership is built from Knowledge Modules (KM), Practical Modules (PM), and — where required — Workplace Experience Modules (WM). Each KM includes five standard documents.';
