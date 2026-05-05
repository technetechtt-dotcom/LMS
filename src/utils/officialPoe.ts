import type { OfficialPoeRequirementRow } from '../components/poe/OfficialPOEPanel';

function submitted(
  s: OfficialPoeRequirementRow['submission'],
): boolean {
  return s === 'submitted' || s === 'verified';
}

export function evaluateOfficialPoeReadiness(
  rows: OfficialPoeRequirementRow[],
  moderatorAssigned: boolean,
): { canCompile: boolean; blockingReasons: string[] } {
  const reasons: string[] = [];

  const adminRows = rows.filter((r) => r.category === 'admin');
  for (const r of adminRows) {
    if (r.submission !== 'verified') {
      reasons.push(`"${r.title}" must be submitted and verified.`);
    }
  }

  const wb = rows.find((r) => r.category === 'workbook');
  if (wb) {
    if (!submitted(wb.submission)) {
      reasons.push('Learner workbook must be submitted.');
    }
    if (!wb.facilitatorMarkedSigned) {
      reasons.push(
        'Learner workbook must be marked and signed by the assigned facilitator.',
      );
    }
  }

  const sum = rows.find((r) => r.category === 'summative');
  if (sum) {
    if (!submitted(sum.submission)) {
      reasons.push('Summative assessment must be submitted.');
    }
    if (!sum.assessorMarkedSigned) {
      reasons.push(
        'Summative assessment must be marked and signed by the assigned assessor.',
      );
    }
    if (moderatorAssigned && sum.moderatorMarkedSigned !== true) {
      reasons.push(
        'Summative assessment must be signed off by the assigned moderator for this programme.',
      );
    }
  }

  return { canCompile: reasons.length === 0, blockingReasons: reasons };
}
