import {
  ARTIFACT_LABELS,
  detectModuleFamily,
  requiredSlugsForFamily,
  type ModuleFamily,
} from './learnership-curriculum';

export type MaterialCompletenessInput = {
  id: string;
  title: string;
  moduleCode?: string | null;
  artifactSlug: string;
  programmeId?: string | null;
  programmeName?: string | null;
};

export type MissingArtifact = { slug: string; label: string };

export type ModuleCompletenessRow = {
  moduleCode: string;
  family: ModuleFamily;
  programmeId: string;
  programmeName: string;
  requiredCount: number;
  presentCount: number;
  complete: boolean;
  missing: MissingArtifact[];
  present: Array<{
    slug: string;
    label: string;
    materialId: string;
    title: string;
  }>;
};

export type ProgrammeCompletenessReport = {
  programmeId: string;
  programmeName: string;
  modules: ModuleCompletenessRow[];
  summary: {
    totalModules: number;
    completeModules: number;
    incompleteModules: number;
    overallPercent: number;
  };
};

function normalizeModuleCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Groups library materials by programme + module code and flags missing KM/PM/WM documents. */
export function evaluateModuleCompleteness(
  materials: MaterialCompletenessInput[],
  programmeIdFilter?: string,
): ProgrammeCompletenessReport[] {
  const grouped = new Map<
    string,
    {
      programmeId: string;
      programmeName: string;
      moduleCode: string;
      family: ModuleFamily;
      bySlug: Map<string, MaterialCompletenessInput>;
    }
  >();

  for (const m of materials) {
    const code = normalizeModuleCode(m.moduleCode ?? '');
    const family = detectModuleFamily(code);
    if (!family || !m.programmeId) continue;
    if (programmeIdFilter && m.programmeId !== programmeIdFilter) continue;

    const key = `${m.programmeId}|${code}`;
    let bucket = grouped.get(key);
    if (!bucket) {
      bucket = {
        programmeId: m.programmeId,
        programmeName: m.programmeName ?? 'Programme',
        moduleCode: code,
        family,
        bySlug: new Map(),
      };
      grouped.set(key, bucket);
    }
    const slug = m.artifactSlug === 'na' ? 'other' : m.artifactSlug;
    if (slug !== 'other' && !bucket.bySlug.has(slug)) {
      bucket.bySlug.set(slug, m);
    }
  }

  const byProgramme = new Map<string, ProgrammeCompletenessReport>();

  for (const bucket of grouped.values()) {
    const required = requiredSlugsForFamily(bucket.family);
    const present: ModuleCompletenessRow['present'] = [];
    const missing: MissingArtifact[] = [];

    for (const slug of required) {
      const mat = bucket.bySlug.get(slug);
      if (mat) {
        present.push({
          slug,
          label: ARTIFACT_LABELS[slug] ?? slug,
          materialId: mat.id,
          title: mat.title,
        });
      } else {
        missing.push({
          slug,
          label: ARTIFACT_LABELS[slug] ?? slug,
        });
      }
    }

    const row: ModuleCompletenessRow = {
      moduleCode: bucket.moduleCode,
      family: bucket.family,
      programmeId: bucket.programmeId,
      programmeName: bucket.programmeName,
      requiredCount: required.length,
      presentCount: present.length,
      complete: missing.length === 0,
      missing,
      present,
    };

    let report = byProgramme.get(bucket.programmeId);
    if (!report) {
      report = {
        programmeId: bucket.programmeId,
        programmeName: bucket.programmeName,
        modules: [],
        summary: {
          totalModules: 0,
          completeModules: 0,
          incompleteModules: 0,
          overallPercent: 0,
        },
      };
      byProgramme.set(bucket.programmeId, report);
    }
    report.modules.push(row);
  }

  for (const report of byProgramme.values()) {
    report.modules.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
    const total = report.modules.length;
    const complete = report.modules.filter((m) => m.complete).length;
    report.summary = {
      totalModules: total,
      completeModules: complete,
      incompleteModules: total - complete,
      overallPercent:
        total > 0 ? Math.round((complete / total) * 100) : 100,
    };
  }

  return [...byProgramme.values()].sort((a, b) =>
    a.programmeName.localeCompare(b.programmeName),
  );
}
