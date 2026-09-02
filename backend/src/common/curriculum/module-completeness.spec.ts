import {
  evaluateModuleCompleteness,
  type ProgrammeCompletenessReport,
} from './module-completeness';

describe('evaluateModuleCompleteness', () => {
  const programmeId = 'prog-1';

  it('flags missing KM documents', () => {
    const reports = evaluateModuleCompleteness(
      [
        {
          id: '1',
          title: 'KM-03 Learner Guide',
          moduleCode: 'KM-03',
          artifactSlug: 'learner-guide',
          programmeId,
          programmeName: 'IT Learnership',
        },
        {
          id: '2',
          title: 'KM-03 Workbook',
          moduleCode: 'KM-03',
          artifactSlug: 'learner-workbook',
          programmeId,
          programmeName: 'IT Learnership',
        },
      ],
      programmeId,
    );

    expect(reports).toHaveLength(1);
    const km03 = reports[0].modules.find((m) => m.moduleCode === 'KM-03');
    expect(km03?.complete).toBe(false);
    expect(km03?.missing.map((m) => m.slug)).toEqual(
      expect.arrayContaining([
        'facilitator-guide',
        'summative-memo',
        'summative',
      ]),
    );
    expect(km03?.presentCount).toBe(2);
    expect(km03?.requiredCount).toBe(5);
  });

  it('marks a module complete when all required artefacts exist', () => {
    const slugs = [
      'facilitator-guide',
      'summative-memo',
      'learner-guide',
      'learner-workbook',
      'summative',
    ];
    const reports = evaluateModuleCompleteness(
      slugs.map((slug, i) => ({
        id: String(i),
        title: `KM-01 ${slug}`,
        moduleCode: 'KM-01',
        artifactSlug: slug,
        programmeId,
        programmeName: 'IT Learnership',
      })),
      programmeId,
    );

    const km01 = reports[0].modules[0];
    expect(km01.complete).toBe(true);
    expect(km01.missing).toHaveLength(0);
    expect(reports[0].summary.overallPercent).toBe(100);
  });

  it('evaluates PM and WM families separately', () => {
    const reports = evaluateModuleCompleteness([
      {
        id: 'p1',
        title: 'PM-01 Guide',
        moduleCode: 'PM-01',
        artifactSlug: 'practical-guide',
        programmeId,
        programmeName: 'IT Learnership',
      },
      {
        id: 'w1',
        title: 'WM-01 Logbook',
        moduleCode: 'WM-01',
        artifactSlug: 'workplace-logbook',
        programmeId,
        programmeName: 'IT Learnership',
      },
    ]);

    expect(reports[0].modules).toHaveLength(2);
    const pm = reports[0].modules.find((m) => m.family === 'PM');
    const wm = reports[0].modules.find((m) => m.family === 'WM');
    expect(pm?.requiredCount).toBe(3);
    expect(wm?.requiredCount).toBe(3);
    expect(pm?.complete).toBe(false);
    expect(wm?.complete).toBe(false);
  });
});
