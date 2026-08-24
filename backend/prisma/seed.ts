import {
  PrismaClient,
  OrganisationType,
  LearnerLifecycleStatus,
  CompetencyResult,
  ModerationDecision,
  WorkflowAction,
  ProgrammeKind,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const roleCodes = [
    ['ADMIN', 'SDIO Admin'],
    ['PLATFORM_ADMIN', 'Platform Super Admin'],
    ['LEARNER', 'Learner'],
    ['FACILITATOR', 'Facilitator'],
    ['ASSESSOR', 'Assessor'],
    ['MODERATOR', 'Moderator'],
    ['QA_OFFICER', 'QA Officer'],
    ['SETA', 'SETA Official'],
  ] as const;

  for (const [code, name] of roleCodes) {
    await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  const sdio = await prisma.organisation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'SkillForge SDIO',
      type: OrganisationType.SDIO,
      registrationNo: 'SDIO-001',
    },
  });

  const employer = await prisma.organisation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'TechCorp Employer',
      type: OrganisationType.EMPLOYER,
      registrationNo: 'EMP-7788',
    },
  });

  const seta = await prisma.organisation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'MICT SETA',
      type: OrganisationType.SETA,
      registrationNo: 'SETA-331',
    },
  });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@skillforge.co.za' },
    update: {},
    create: {
      email: 'admin@skillforge.co.za',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
    },
  });

  const learner = await prisma.user.upsert({
    where: { email: 'learner@skillforge.co.za' },
    update: {},
    create: {
      email: 'learner@skillforge.co.za',
      passwordHash,
      firstName: 'Lerato',
      lastName: 'Mokoena',
    },
  });

  const assessor = await prisma.user.upsert({
    where: { email: 'assessor@skillforge.co.za' },
    update: {},
    create: {
      email: 'assessor@skillforge.co.za',
      passwordHash,
      firstName: 'Sipho',
      lastName: 'Ndlovu',
    },
  });

  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@skillforge.co.za' },
    update: {},
    create: {
      email: 'moderator@skillforge.co.za',
      passwordHash,
      firstName: 'Nomsa',
      lastName: 'Khuzwayo',
    },
  });

  /** LEAD_FACILITATOR matches schema enum FacilitatorRole. Cast avoids stale IDE Prisma types before `npm run prisma:generate`. */
  const facilitator = await prisma.user.upsert({
    where: { email: 'facilitator@skillforge.co.za' },
    update: {
      facilitatorRole: 'LEAD_FACILITATOR',
    },
    create: {
      email: 'facilitator@skillforge.co.za',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      facilitatorRole: 'LEAD_FACILITATOR',
    },
  } as Parameters<PrismaClient['user']['upsert']>[0]);

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  const learnerRole = await prisma.role.findUniqueOrThrow({ where: { code: 'LEARNER' } });
  const assessorRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ASSESSOR' } });
  const moderatorRole = await prisma.role.findUniqueOrThrow({ where: { code: 'MODERATOR' } });
  const setaRole = await prisma.role.findUniqueOrThrow({ where: { code: 'SETA' } });
  const facilitatorRoleRow = await prisma.role.findUniqueOrThrow({
    where: { code: 'FACILITATOR' },
  });

  await prisma.userOrganisation.createMany({
    data: [
      { userId: admin.id, organisationId: sdio.id, roleId: adminRole.id, isPrimary: true },
      { userId: learner.id, organisationId: sdio.id, roleId: learnerRole.id, isPrimary: true },
      { userId: assessor.id, organisationId: sdio.id, roleId: assessorRole.id, isPrimary: true },
      { userId: moderator.id, organisationId: sdio.id, roleId: moderatorRole.id, isPrimary: true },
      {
        userId: facilitator.id,
        organisationId: sdio.id,
        roleId: facilitatorRoleRow.id,
        isPrimary: true,
      },
      { userId: admin.id, organisationId: seta.id, roleId: setaRole.id, isPrimary: false },
    ],
    skipDuplicates: true,
  });

  const qualification = await prisma.qualification.upsert({
    where: { saqaId: '48872' },
    update: {},
    create: {
      saqaId: '48872',
      title: 'National Certificate: Information Technology (Systems Development)',
      nqfLevel: 5,
      totalCredits: 131,
      field: 'Information Technology',
    },
  });

  const unit = await prisma.unitStandard.upsert({
    where: { code: 'US-115359' },
    update: {},
    create: {
      code: 'US-115359',
      title: 'Demonstrate understanding of systems development',
      credits: 8,
      level: 5,
      qualificationId: qualification.id,
    },
  });

  const outcome = await prisma.outcome.upsert({
    where: { unitStandardId_code: { unitStandardId: unit.id, code: 'OUT-1' } },
    update: {},
    create: {
      unitStandardId: unit.id,
      code: 'OUT-1',
      description: 'Apply systems analysis techniques in practical contexts',
    },
  });

  const programme = await prisma.programme.upsert({
    where: { organisationId_code: { organisationId: sdio.id, code: 'ITS-NQF5' } },
    update: { programmeKind: ProgrammeKind.OCCUPATIONAL_PROGRAMME },
    create: {
      organisationId: sdio.id,
      qualificationId: qualification.id,
      code: 'ITS-NQF5',
      title: 'IT Systems Development Learnership',
      programmeKind: ProgrammeKind.OCCUPATIONAL_PROGRAMME,
    },
  });

  const enrollment = await prisma.enrollment.create({
    data: {
      learnerId: learner.id,
      programmeId: programme.id,
      sdioOrganisationId: sdio.id,
      employerOrganisationId: employer.id,
      status: LearnerLifecycleStatus.ASSESSMENT,
      startedAt: new Date(),
      metadata: {
        idNumber: '9001015009087',
        progress: 72,
        phone: '+27 82 000 0000',
        setaStatus: 'compliant',
        lastActivity: '2 hours ago',
        lastActivityDescription: 'Assessment submission',
        expectedCompletionDate: '2024-12-15',
      },
    },
  });

  await prisma.enrollmentWorkflow.create({
    data: {
      enrollmentId: enrollment.id,
      fromState: LearnerLifecycleStatus.TRAINING,
      toState: LearnerLifecycleStatus.ASSESSMENT,
      action: WorkflowAction.START_ASSESSMENT,
      changedById: admin.id,
      reason: 'Ready for formal assessment',
    },
  });

  const assessment = await prisma.assessment.create({
    data: {
      enrollmentId: enrollment.id,
      unitStandardId: unit.id,
      assessorId: assessor.id,
      result: CompetencyResult.C,
      feedback: 'Consistent evidence submitted and verified',
    },
  });

  const questionCount = await prisma.assessmentQuestion.count({
    where: { unitStandardId: unit.id, deletedAt: null },
  });
  if (questionCount === 0) {
    await prisma.assessmentQuestion.createMany({
      data: [
        {
          unitStandardId: unit.id,
          orderIndex: 1,
          prompt: 'Which lifecycle phase focuses on understanding user and business requirements?',
          questionType: 'mcq_single',
          options: {
            choices: ['Analysis', 'Design', 'Development', 'Maintenance'],
            correctIndex: 0,
          },
          points: 1,
        },
        {
          unitStandardId: unit.id,
          orderIndex: 2,
          prompt:
            'Briefly describe how you would verify that a systems change meets documented requirements.',
          questionType: 'long_answer',
          points: 5,
        },
      ],
    });
  }

  const welcomeCount = await prisma.inAppNotification.count({
    where: { userId: learner.id, title: 'Welcome to SkillForge' },
  });
  if (welcomeCount === 0) {
    await prisma.inAppNotification.create({
      data: {
        userId: learner.id,
        type: 'system',
        title: 'Welcome to SkillForge',
        body: 'You are enrolled in IT Systems Development Learnership. Complete your PoE components on time.',
      },
    });
  }

  await prisma.moderation.create({
    data: {
      assessmentId: assessment.id,
      moderatorId: moderator.id,
      decision: ModerationDecision.APPROVED,
      feedback: 'Assessment aligns with moderation policy',
    },
  });

  await prisma.evidence.create({
    data: {
      enrollmentId: enrollment.id,
      unitStandardId: unit.id,
      outcomeId: outcome.id,
      fileName: 'network-installation-video.mp4',
      fileType: 'video/mp4',
      fileSize: 4021044,
      storageKey: 'evidence/network-installation-video.mp4',
      url: 'https://mock-s3/evidence/network-installation-video.mp4',
      uploadedById: learner.id,
    },
  });

  await prisma.workflowState.createMany({
    data: [
      { code: LearnerLifecycleStatus.ENROLLED, label: 'Enrolled', order: 1 },
      { code: LearnerLifecycleStatus.TRAINING, label: 'Training', order: 2 },
      { code: LearnerLifecycleStatus.WORKPLACE, label: 'Workplace', order: 3 },
      { code: LearnerLifecycleStatus.ASSESSMENT, label: 'Assessment', order: 4 },
      { code: LearnerLifecycleStatus.MODERATION, label: 'Moderation', order: 5 },
      { code: LearnerLifecycleStatus.COMPLETED, label: 'Completed', order: 6 },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
