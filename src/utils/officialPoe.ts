import type { OfficialPoeRequirementRow } from '../components/poe/OfficialPOEPanel';

function submitted(
  s: OfficialPoeRequirementRow['submission'],
): boolean {
  return s === 'submitted' || s === 'verified';
}

function requireWorkflowSignoffs(
  row: OfficialPoeRequirementRow,
  label: string,
  reasons: string[],
  moderatorAssigned: boolean,
) {
  if (!submitted(row.submission)) {
    reasons.push(`${label} must be submitted by the learner.`);
  }
  if (!row.facilitatorMarkedSigned) {
    reasons.push(
      `${label} must be marked and signed by the assigned facilitator.`,
    );
  }
  if (!row.assessorMarkedSigned) {
    reasons.push(
      `${label} must be reviewed and signed by the assigned assessor.`,
    );
  }
  if (moderatorAssigned && row.moderatorMarkedSigned !== true) {
    reasons.push(
      `${label} must be signed off by the assigned moderator for this programme.`,
    );
  }
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
    requireWorkflowSignoffs(wb, 'Learner workbook', reasons, moderatorAssigned);
  }

  const sum = rows.find((r) => r.category === 'summative');
  if (sum) {
    requireWorkflowSignoffs(
      sum,
      'Summative assessment',
      reasons,
      moderatorAssigned,
    );
  }

  return { canCompile: reasons.length === 0, blockingReasons: reasons };
}
