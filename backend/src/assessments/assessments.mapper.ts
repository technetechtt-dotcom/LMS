import type {
  Assessment,
  AssessmentSubmission,
  Enrollment,
  Moderation,
  Programme,
  UnitStandard,
  User,
} from '@prisma/client';

export type AssessmentWithRelations = Assessment & {
  enrollment: Enrollment & {
    programme: Programme;
    learner: User;
  };
  unitStandard: UnitStandard;
  moderation: Moderation | null;
  submissions?: AssessmentSubmission[];
};

/** Maps Prisma competency assessments → frontend `Assessment` document shape (quiz fields stubbed). */
export function mapAssessmentToApi(a: AssessmentWithRelations): Record<string, unknown> {
  const p = a.enrollment.programme;
  const learner = a.enrollment.learner;
  const learnerName = `${learner.firstName} ${learner.lastName}`.trim();
  const latestSubmission = a.submissions?.[0];
  const submissionStatus = latestSubmission?.status;
  const competencyFinalised = ['C', 'NYC'].includes(a.result);
  return {
    id: a.id,
    title: a.unitStandard.title,
    moduleId: a.unitStandardId,
    moduleName: a.unitStandard.code,
    programmeId: p.id,
    programmeName: p.title,
    enrollmentId: a.enrollmentId,
    learnerName,
    assessorId: a.assessorId,
    assessedAt: a.assessedAt.toISOString(),
    submissionStatus,
    needsFacilitatorMarking: ['submitted', 'facilitator_grading', 'grading'].includes(
      submissionStatus ?? '',
    ),
    needsAssessorReview: ['facilitator_graded', 'assessor_review'].includes(
      submissionStatus ?? '',
    ),
    needsModeration:
      a.moderation == null &&
      competencyFinalised &&
      submissionStatus === 'assessor_verified',
    type: 'mixed',
    format: 'Unit standard • Competency',
    status: 'completed',
    isPublished: true,
    passMark: 50,
    totalMarks: 100,
    questionCount: 0,
    questions: [],
    rubricCriteria: [],
    attempts: 1,
    totalLearners: 1,
    isAIGenerated: false,
    createdBy: a.assessorId,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
