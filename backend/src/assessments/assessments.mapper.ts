import type {
  Assessment,
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
};

/** Maps Prisma competency assessments → frontend `Assessment` document shape (quiz fields stubbed). */
export function mapAssessmentToApi(a: AssessmentWithRelations): Record<string, unknown> {
  const p = a.enrollment.programme;
  const learner = a.enrollment.learner;
  const learnerName = `${learner.firstName} ${learner.lastName}`.trim();
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
    needsModeration: a.moderation == null,
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
