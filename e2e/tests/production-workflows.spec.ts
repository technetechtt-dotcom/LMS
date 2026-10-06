import {
  expect,
  request as createRequest,
  test,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion -- workflow fixtures deliberately inspect heterogeneous API payloads */

const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8787';
const PASSWORD = 'Password123!';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

type Json = Record<string, any>;
type Role =
  | 'admin'
  | 'learner'
  | 'assessor'
  | 'moderator'
  | 'facilitator'
  | 'mentor'
  | 'qa'
  | 'seta'
  | 'platform';

const EMAILS: Record<Role, string> = {
  admin: 'admin@skillforge.co.za',
  learner: 'learner@skillforge.co.za',
  assessor: 'assessor@skillforge.co.za',
  moderator: 'moderator@skillforge.co.za',
  facilitator: 'facilitator@skillforge.co.za',
  mentor: 'mentor@skillforge.co.za',
  qa: 'qa@skillforge.co.za',
  seta: 'seta@skillforge.co.za',
  platform: 'platform@skillforge.co.za',
};

function dataOf<T = Json>(body: any): T {
  return (body && typeof body === 'object' && 'data' in body ? body.data : body) as T;
}

function rowsOf(body: any): Json[] {
  const data = dataOf<any>(body);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  throw new Error(`Expected an array response, received ${JSON.stringify(body).slice(0, 400)}`);
}

async function jsonOk(response: APIResponse): Promise<Json> {
  const text = await response.text();
  expect(response.ok(), `${response.url()} -> ${response.status()} ${text}`)
    .toBeTruthy();
  return text ? JSON.parse(text) as Json : {};
}

test.describe('production workflow acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  let api: APIRequestContext;
  const tokens = new Map<Role, string>();
  const users = new Map<Role, Json>();
  let programme: Json;
  let enrollment: Json;
  let assessment: Json;
  let instrument: Json;
  let questions: Json[] = [];
  let submission: Json;
  let invitedUser: Json;
  let invitedEnrollment: Json;
  let provisionedOrganisation: Json;
  let provisionedEnrollment: Json;
  let qualificationId = '';

  const headers = (role: Role, organisationId = ORG_ID) => ({
    Authorization: `Bearer ${tokens.get(role)}`,
    'X-Organisation-Id': organisationId,
  });

  test.beforeAll(async () => {
    test.setTimeout(90_000);
    api = await createRequest.newContext({ baseURL: API_URL });
    for (const role of Object.keys(EMAILS) as Role[]) {
      try {
        const login = await jsonOk(await api.post('/auth/login', {
          data: {
            email: EMAILS[role],
            password: PASSWORD,
            portal: role === 'platform' ? 'ops' : 'lms',
          },
        }));
        tokens.set(role, String(login.accessToken));
      } catch (err) {
        throw new Error(`Failed login for role ${role} (${EMAILS[role]}): ${err}`);
      }
    }

    const userRows = rowsOf(await jsonOk(await api.get('/users', { headers: headers('admin') })));
    for (const role of Object.keys(EMAILS) as Role[]) {
      const row = userRows.find((item) => item.email === EMAILS[role]);
      if (row) users.set(role, row);
    }
    expect(users.get('learner')?.id).toBeTruthy();
    expect(users.get('moderator')?.id).toBeTruthy();

    const programmes = rowsOf(await jsonOk(await api.get('/programmes', { headers: headers('admin') })));
    programme = programmes.find((item) => item.code === 'ITS-NQF5') ?? programmes[0];
    expect(programme?.id).toBeTruthy();

    const learners = rowsOf(await jsonOk(await api.get('/learners', { headers: headers('admin') })));
    enrollment = learners.find((item) => item.email === EMAILS.learner) ?? learners[0];
    expect(enrollment?.id).toBeTruthy();

    const assessments = rowsOf(await jsonOk(await api.get('/assessments', { headers: headers('admin') })));
    assessment = assessments.find((item) => item.learnerId === enrollment.id)
      ?? assessments.find((item) => item.enrollmentId === enrollment.id)
      ?? assessments[0];
    expect(assessment?.id).toBeTruthy();
  });

  test.afterAll(async () => {
    await api?.dispose();
  });

  test('instrument authoring -> independent approval -> publication', async () => {
    const units = rowsOf(await jsonOk(await api.get('/assessment-instruments/unit-standards/list', {
      headers: headers('facilitator'),
    })));
    expect(units.length).toBeGreaterThan(0);
    const created = await jsonOk(await api.post('/assessment-instruments', {
      headers: headers('facilitator'),
      data: {
        unitStandardId: units[0].id,
        title: `E2E independent instrument ${Date.now()}`,
        maxAttempts: 3,
        passMark: 50,
        timeLimitMinutes: 15,
      },
    }));
    instrument = dataOf(created);

    await jsonOk(await api.post(`/assessment-instruments/${instrument.id}/questions`, {
      headers: headers('facilitator'),
      data: {
        questions: [
          {
            type: 'multiple_choice', content: 'Which phase identifies requirements?',
            points: 1, options: ['Analysis', 'Deployment'], correctIndex: 0,
          },
          {
            type: 'essay', content: 'Explain how requirements are verified.', points: 5,
          },
        ],
      },
    }));
    const submitted = dataOf(await jsonOk(await api.post(
      `/assessment-instruments/${instrument.id}/submit-review`,
      { headers: headers('facilitator') },
    )));
    expect(submitted.status).toBe('IN_REVIEW');

    const approved = dataOf(await jsonOk(await api.post(
      `/assessment-instruments/${instrument.id}/approve`,
      { headers: headers('qa'), data: { notes: 'Independent QA review complete' } },
    )));
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedById).toBe(users.get('qa')?.id);

    instrument = dataOf(await jsonOk(await api.post(
      `/assessment-instruments/${instrument.id}/publish`,
      { headers: headers('qa') },
    )));
    expect(instrument.status).toBe('PUBLISHED');
  });

  test('learner attempt -> autosave -> token refresh -> expiry contract -> submission', async () => {
    for (const role of ['admin', 'assessor', 'facilitator'] as Role[]) {
      const denied = await api.post(`/assessments/${assessment.id}/start-attempt`, {
        headers: headers(role),
      });
      expect(denied.status()).toBe(403);
    }

    const learnerSession = await createRequest.newContext({ baseURL: API_URL });
    try {
      const login = await jsonOk(await learnerSession.post('/auth/login', {
        data: { email: EMAILS.learner, password: PASSWORD, portal: 'lms' },
      }));
      let learnerHeaders = {
        Authorization: `Bearer ${login.accessToken}`,
        'X-Organisation-Id': ORG_ID,
      };
      submission = dataOf(await jsonOk(await learnerSession.post(
        `/assessments/${assessment.id}/start-attempt`,
        { headers: learnerHeaders },
      )));
      expect(submission.expired).toBe(false);
      expect(submission.expiresAt).toBeTruthy();

      questions = dataOf<Json[]>(await jsonOk(await learnerSession.get(
        `/assessments/${assessment.id}/questions`,
        { headers: learnerHeaders },
      )));
      expect(questions).toHaveLength(2);
      expect(questions[0]).not.toHaveProperty('correctOptionId');

      const responses = questions.map((question) => ({
        questionId: question.id,
        questionType: question.type,
        answer: question.type === 'multiple_choice' ? '0' : 'Requirements are traced to acceptance tests.',
      }));
      const saved = dataOf(await jsonOk(await learnerSession.patch(
        `/assessment-instances/${submission.id}/progress`,
        { headers: learnerHeaders, data: { responses } },
      )));
      expect(saved.status).toBe('in_progress');

      const refreshed = await jsonOk(await learnerSession.post('/auth/refresh'));
      learnerHeaders = {
        Authorization: `Bearer ${refreshed.accessToken}`,
        'X-Organisation-Id': ORG_ID,
      };
      submission = dataOf(await jsonOk(await learnerSession.post('/assessment-instances', {
        headers: learnerHeaders,
        data: { assessmentId: assessment.id, responses },
      })));
      expect(String(submission.status).toLowerCase()).toBe('submitted');
    } finally {
      await learnerSession.dispose();
    }
  });

  test('facilitator grading -> assessor decision -> allocated moderation', async () => {
    const essay = questions.find((question) => question.type === 'essay');
    expect(essay?.id).toBeTruthy();
    await jsonOk(await api.post(`/assessment-instances/${submission.id}/human-grade`, {
      headers: headers('facilitator'),
      data: { grades: [{ questionId: essay!.id, score: 5, feedback: 'Meets the rubric' }] },
    }));
    await jsonOk(await api.post(
      `/assessment-instances/${submission.id}/complete-facilitator-grading`,
      { headers: headers('facilitator') },
    ));
    await jsonOk(await api.post(`/assessment-instances/${submission.id}/human-grade`, {
      headers: headers('assessor'),
      data: { grades: [{ questionId: essay!.id, score: 5, feedback: 'Assessment verified' }] },
    }));
    await jsonOk(await api.post(`/assessment-instances/${submission.id}/complete-grading`, {
      headers: headers('assessor'),
    }));
    const finalised = dataOf(await jsonOk(await api.post(`/assessments/${assessment.id}/finalise-result`, {
      headers: headers('assessor'),
      data: { result: 'C', feedback: 'Competency decision verified' },
    })));
    expect(finalised.result).toBe('C');

    await jsonOk(await api.post('/moderation/allocate', {
      headers: headers('qa'),
      data: { assessmentId: assessment.id, moderatorId: users.get('moderator')!.id },
    }));
    const moderated = dataOf(await jsonOk(await api.post(
      `/assessment-instances/${submission.id}/moderate`,
      { headers: headers('moderator'), data: { decision: 'approve', comments: 'Moderation approved' } },
    )));
    expect(['completed', 'moderated', 'approved']).toContain(String(moderated.status).toLowerCase());
  });

  test('PoE upload -> malware verification -> review -> moderation', async () => {
    const artifact = dataOf(await jsonOk(await api.post('/poe-artifacts', {
      headers: headers('facilitator'),
      data: {
        enrollmentId: enrollment.id,
        kind: 'WORKBOOK',
        title: `E2E workbook ${Date.now()}`,
      },
    })));
    await jsonOk(await api.post(`/poe-artifacts/${artifact.id}/transition`, {
      headers: headers('facilitator'), data: { action: 'issue' },
    }));
    const upload = dataOf(await jsonOk(await api.post(
      `/learners/${enrollment.id}/poe-documents`,
      {
        headers: headers('learner'),
        multipart: {
          metadata: JSON.stringify({ artifactId: artifact.id, category: 'Workbook' }),
          file: { name: 'e2e-workbook.txt', mimeType: 'text/plain', buffer: Buffer.from('verified learner evidence') },
        },
      },
    )));
    await jsonOk(await api.post(`/poe-documents/${upload.id}/verify`, {
      headers: headers('facilitator'),
    }));
    const transitions: Array<[Role, string, Json]> = [
      ['learner', 'submit', {}],
      ['facilitator', 'facilitator_mark', { feedback: 'Facilitator review complete' }],
      ['facilitator', 'allocate_assessor', { assessorId: users.get('assessor')!.id }],
      ['assessor', 'assessor_mark', { feedback: 'Satisfactory evidence' }],
      ['assessor', 'submit_moderation', { moderatorId: users.get('moderator')!.id }],
      ['moderator', 'moderate_approve', { feedback: 'PoE moderation approved' }],
    ];
    let current: Json = artifact;
    for (const [role, action, extra] of transitions) {
      current = dataOf(await jsonOk(await api.post(`/poe-artifacts/${artifact.id}/transition`, {
        headers: headers(role), data: { action, ...extra },
      })));
    }
    expect(current.status).toBe('MODERATION_COMPLETE');
    expect(current.moderationOutcome).toBe('APPROVED');
  });

  test('mandatory attendance -> check-in -> close -> completion calculation', async () => {
    const session = dataOf(await jsonOk(await api.post('/attendance/sessions', {
      headers: headers('facilitator'),
      data: { programmeId: programme.id, title: 'E2E mandatory session', mandatory: true, ttlMinutes: 10 },
    })));
    expect(session.mandatory).toBe(true);
    await jsonOk(await api.post(`/attendance/sessions/${session.sessionId}/check-in`, {
      headers: headers('learner'),
      data: { token: session.qrToken, enrollmentId: enrollment.id },
    }));
    await jsonOk(await api.post(`/attendance/sessions/${session.sessionId}/close`, {
      headers: headers('facilitator'),
    }));
    const summary = dataOf<any>(await jsonOk(await api.get('/attendance/summary', {
      headers: headers('facilitator'),
    })));
    expect(summary.scheduledSessions).toBeGreaterThanOrEqual(1);
    expect(summary.expectedCount).toBeGreaterThanOrEqual(1);
    const completion = dataOf(await jsonOk(await api.get(`/enrollments/${enrollment.id}/completion`, {
      headers: headers('admin'),
    })));
    expect(completion.checks).toBeTruthy();
  });

  test('invitation -> activation -> password setup -> membership', async () => {
    const roles = rowsOf(await jsonOk(await api.get('/users/roles', { headers: headers('admin') })));
    const learnerRole = roles.find((role) => role.code === 'LEARNER');
    expect(learnerRole?.id).toBeTruthy();
    const email = `invited-${Date.now()}@example.test`;
    const invitation = dataOf(await jsonOk(await api.post('/invitations', {
      headers: headers('admin'), data: { email, roleId: learnerRole!.id },
    })));
    expect(invitation.activationToken).toBeTruthy();
    const registration = await jsonOk(await api.post('/auth/register', {
      data: {
        email,
        password: PASSWORD,
        firstName: 'E2E',
        lastName: 'Invitee',
        inviteToken: invitation.activationToken,
      },
    }));
    invitedUser = registration.user;
    expect(invitedUser.email).toBe(email);
    expect(registration.accessToken).toBeTruthy();

    invitedEnrollment = dataOf(await jsonOk(await api.post('/enrollments', {
      headers: headers('admin'),
      data: { learnerId: invitedUser.id, programmeId: programme.id },
    })));
    const directory = rowsOf(await jsonOk(await api.get('/users', { headers: headers('admin') })));
    const membershipUser = directory.find((item) => item.id === invitedUser.id);
    expect(membershipUser?.memberships?.some((membership: Json) => membership.role.code === 'LEARNER'))
      .toBe(true);
  });

  test('credential issue -> PDF download -> verify -> revoke -> reissue', async () => {
    await jsonOk(await api.patch(`/programmes/${programme.id}/completion-requirements`, {
      headers: headers('qa'),
      data: {
        requireAllAssessmentsC: false,
        requireWorkbook: false,
        requireSummative: false,
        minVerifiedWorkplaceHours: 0,
        minAttendanceRatePercent: 0,
      },
    }));
    await jsonOk(await api.post(`/enrollments/${invitedEnrollment.id}/transition`, {
      headers: headers('qa'),
      data: { action: 'START_TRAINING' },
    }));
    await jsonOk(await api.post(`/enrollments/${invitedEnrollment.id}/transition`, {
      headers: headers('qa'),
      data: { action: 'START_ASSESSMENT' },
    }));
    await jsonOk(await api.post(`/enrollments/${invitedEnrollment.id}/transition`, {
      headers: headers('qa'),
      data: { action: 'COMPLETE_ENROLLMENT' },
    }));
    let credential = dataOf(await jsonOk(await api.post('/certificates/issue', {
      headers: headers('qa'), data: { enrollmentId: invitedEnrollment.id },
    })));
    let downloadDescriptor = dataOf(await jsonOk(await api.get(`/certificates/${credential.id}/download`, {
      headers: headers('qa'),
    })));
    let download = await api.get(downloadDescriptor.downloadUrl);
    expect(download.ok()).toBeTruthy();
    expect((await download.body()).subarray(0, 4).toString()).toBe('%PDF');
    let verified = dataOf(await jsonOk(await api.get(`/certificates/verify/${credential.verificationCode}`)));
    expect(verified.credentialStatus).toBe('ISSUED');

    await jsonOk(await api.post(`/certificates/${credential.id}/revoke`, {
      headers: headers('qa'), data: { reason: 'E2E revocation exercise' },
    }));
    verified = dataOf(await jsonOk(await api.get(`/certificates/verify/${credential.verificationCode}`)));
    expect(verified.credentialStatus).toBe('REVOKED');

    const reissued = dataOf(await jsonOk(await api.post(`/certificates/${credential.id}/reissue`, {
      headers: headers('qa'),
    })));
    credential = reissued.replacement;
    expect(credential.status).toBe('issued');
    downloadDescriptor = dataOf(await jsonOk(await api.get(`/certificates/${credential.id}/download`, {
      headers: headers('qa'),
    })));
    download = await api.get(downloadDescriptor.downloadUrl);
    expect(download.ok()).toBeTruthy();
  });

  test('message composition -> attachment -> authorized download', async () => {
    const message = dataOf(await jsonOk(await api.post('/messages', {
      headers: headers('learner'),
      multipart: {
        toId: users.get('facilitator')!.id,
        content: 'E2E message with evidence attachment',
        attachment: {
          name: 'message-evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('message attachment'),
        },
      },
    })));
    expect(message.attachments).toHaveLength(1);
    const inbox = rowsOf(await jsonOk(await api.get('/messages', { headers: headers('facilitator') })));
    expect(inbox.some((item) => item.id === message.id)).toBe(true);
    const attachment = message.attachments[0];
    const link = dataOf(await jsonOk(await api.get(
      `/messages/${message.id}/attachments/${attachment.uploadId}/download`,
      { headers: headers('facilitator') },
    )));
    const downloaded = await api.get(link.downloadUrl);
    expect(downloaded.ok()).toBeTruthy();
    expect((await downloaded.body()).toString()).toBe('message attachment');
  });

  test('workplace log -> assigned mentor verification', async () => {
    const log = dataOf(await jsonOk(await api.post('/workplace-logs', {
      headers: headers('learner'),
      data: {
        enrollmentId: enrollment.id,
        logDate: new Date().toISOString(),
        hoursWorked: 8,
        activity: 'E2E supervised systems-analysis work',
        supervisorName: 'Assigned Mentor',
        supervisorEmail: EMAILS.mentor,
      },
    })));
    const verified = dataOf(await jsonOk(await api.post(`/workplace-logs/${log.id}/mentor-verify`, {
      headers: headers('mentor'),
      data: { decision: 'approve', feedback: 'Workplace activity verified' },
    })));
    expect(verified.mentorStatus).toBe('VERIFIED');
    expect(verified.mentorVerifiedById).toBe(users.get('mentor')!.id);
  });

  test('compliance evidence -> authoritative decision -> alert resolution', async () => {
    const document = dataOf(await jsonOk(await api.post('/compliance/documents', {
      headers: headers('qa'),
      multipart: {
        metadata: JSON.stringify({ name: 'E2E compliance evidence', category: 'compliance' }),
        file: { name: 'compliance-evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('control evidence') },
      },
    })));
    expect(document.uploadStatus).toBe('VERIFIED');
    const decision = dataOf(await jsonOk(await api.put('/compliance/decisions/learner-registration', {
      headers: headers('qa'),
      data: { status: 'SATISFIED', notes: 'Evidence reviewed', evidenceDocumentIds: [document.id] },
    })));
    expect(decision.evidenceDocumentIds).toContain(document.id);

    const alert = dataOf(await jsonOk(await api.post('/compliance/alerts', {
      headers: headers('qa'),
      data: { controlKey: 'learner-registration', title: 'E2E compliance alert', details: 'Exercise resolution' },
    })));
    await jsonOk(await api.post(`/compliance/alerts/${alert.id}/acknowledge`, {
      headers: headers('qa'),
    }));
    const resolved = dataOf(await jsonOk(await api.post(`/compliance/alerts/${alert.id}/resolve`, {
      headers: headers('qa'),
      data: { notes: 'Resolved with verified evidence', evidenceDocumentIds: [document.id] },
    })));
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolvedById).toBe(users.get('qa')!.id);
  });

  test('filtered report -> persisted snapshot -> CSV and PDF validation', async () => {
    const query = `programmeId=${encodeURIComponent(programme.id)}`;
    const csv = await api.get(`/reports/seta-snapshot?format=csv&${query}`, {
      headers: headers('admin'),
    });
    expect(csv.ok()).toBeTruthy();
    expect(csv.headers()['content-type']).toContain('text/csv');
    expect(await csv.text()).toContain('enrollments');

    const pdf = await api.get(`/reports/seta-snapshot?format=pdf&${query}`, {
      headers: headers('admin'),
    });
    expect(pdf.ok()).toBeTruthy();
    expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');

    const snapshot = dataOf(await jsonOk(await api.post('/reports/generated', {
      headers: headers('admin'),
      data: { reportType: 'seta-snapshot', format: 'csv', filters: { programmeId: programme.id } },
    })));
    const persisted = await api.get(`/reports/generated/${snapshot.id}/download`, {
      headers: headers('admin'),
    });
    expect(persisted.ok()).toBeTruthy();
    expect(persisted.headers()['content-type']).toContain('text/csv');
  });

  test('Ops organisation, programme and user provisioning', async () => {
    const stamp = Date.now();
    provisionedOrganisation = dataOf(await jsonOk(await api.post('/organisations', {
      headers: headers('platform'),
      data: { name: `E2E Tenant ${stamp}`, registrationNo: `E2E-${stamp}`, type: 'SDIO' },
    })));
    qualificationId = String(programme.qualificationId);
    expect(qualificationId).toBeTruthy();
    const provisionedProgramme = dataOf(await jsonOk(await api.post('/programmes', {
      headers: headers('platform', provisionedOrganisation.id),
      data: {
        qualificationId,
        code: `E2E-${stamp}`,
        title: 'E2E provisioned programme',
        programmeKind: 'OCCUPATIONAL_PROGRAMME',
      },
    })));
    const roles = rowsOf(await jsonOk(await api.get('/users/roles', {
      headers: headers('platform', provisionedOrganisation.id),
    })));
    const learnerRole = roles.find((role) => role.code === 'LEARNER');
    await jsonOk(await api.post('/users', {
      headers: headers('platform', provisionedOrganisation.id),
      data: {
        email: `cross-tenant-${stamp}@example.test`,
        firstName: 'Cross',
        lastName: 'Tenant',
        roleId: learnerRole!.id,
        organisationId: provisionedOrganisation.id,
        programmeId: provisionedProgramme.id,
      },
    }));
    const provisionedLearners = rowsOf(await jsonOk(await api.get('/learners', {
      headers: headers('platform', provisionedOrganisation.id),
    })));
    provisionedEnrollment = provisionedLearners.find((item) => item.programmeId === provisionedProgramme.id)!;
    expect(provisionedEnrollment?.id).toBeTruthy();
  });

  test('negative cross-tenant and unassigned-resource access for every role', async () => {
    for (const role of [
      'admin', 'learner', 'assessor', 'moderator',
      'facilitator', 'mentor', 'qa', 'seta',
    ] as Role[]) {
      const denied = await api.get(`/learners/${provisionedEnrollment.id}`, {
        headers: headers(role),
      });
      expect([403, 404], `${role} unexpectedly crossed tenant boundaries`).toContain(denied.status());
    }

    const mentorAssessment = await api.get(`/assessments/${assessment.id}`, {
      headers: headers('mentor'),
    });
    expect([403, 404]).toContain(mentorAssessment.status());
    const answerKey = await api.get(`/assessments/${assessment.id}/answer-key`, {
      headers: headers('mentor'),
    });
    expect(answerKey.status()).toBe(403);

    const facilitatorCrossProgramme = await api.get(`/learners/${provisionedEnrollment.id}`, {
      headers: headers('facilitator', provisionedOrganisation.id),
    });
    expect([403, 404]).toContain(facilitatorCrossProgramme.status());
  });
});
