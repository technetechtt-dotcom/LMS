import { apiFetchJSON, apiFetchFormData, buildQuery } from './httpClient';
import type {
  User,
  Learner,
  Assessment,
  AssessmentInstance,
  Question,
  QuestionResponse,
  POEDocument,
  ComplianceDocument,
  TrainingMaterial,
  Programme,
  CreateProgrammePayload,
  Message,
  Notification,
  SETASubmission,
  ApiResponse,
  PaginatedResponse,
  FilterOptions,
  ModerationDecision,
  LoginCredentials,
} from '../types';

function normalizePaginated<T>(raw: unknown): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    const data = raw as T[];
    return {
      data,
      total: data.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
  }
  if (!raw || typeof raw !== 'object') {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
  const o = raw as Record<string, unknown>;
  if ('success' in o && 'data' in o) {
    return normalizePaginated(o.data);
  }
  if (Array.isArray(o.data) && typeof o.total === 'number') {
    return {
      data: o.data as T[],
      total: o.total,
      page: (o.page as number) ?? 1,
      pageSize: (o.pageSize as number) ?? 20,
      totalPages: (o.totalPages as number) ?? 1,
    };
  }
  if (Array.isArray(o.data)) {
    const data = o.data as T[];
    return {
      data,
      total: data.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
  }
  return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
}

function unwrapData<T>(raw: ApiResponse<T> | { data: T } | T): T {
  if (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw) {
    return (raw as ApiResponse<T>).data;
  }
  if (raw && typeof raw === 'object' && raw !== null) {
    const keys = Object.keys(raw as object);
    if (keys.length === 1 && keys[0] === 'data') {
      return (raw as { data: T }).data;
    }
  }
  return raw as T;
}

async function remotePostJson<T>(
  path: string,
  body: unknown,
  method: 'POST' | 'PATCH' | 'PUT' = 'POST',
): Promise<ApiResponse<T>> {
  const raw = await apiFetchJSON<ApiResponse<T> | T>(path, {
    method,
    body: JSON.stringify(body),
  });
  if (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw)
    return raw as ApiResponse<T>;
  return { data: raw as T, success: true };
}

type RemoteLoginEnvelope = {
  user: User;
  accessToken?: string;
  refreshToken?: string;
};

export const authService = {
  login: async (
    credentials: LoginCredentials,
  ): Promise<
    ApiResponse<User> & { accessToken?: string; refreshToken?: string }
  > => {
    if (!credentials.password || credentials.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    const payload = await apiFetchJSON<RemoteLoginEnvelope>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return {
      data: payload.user,
      success: true,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    };
  },

  logout: async (accessToken?: string | null): Promise<ApiResponse<null>> => {
    try {
      await apiFetchJSON<{ success?: boolean }>('/auth/logout', {
        method: 'POST',
        accessToken: accessToken ?? undefined,
      });
    } catch {
      /* still clear local session */
    }
    return { data: null, success: true };
  },

  forgotPassword: async (
    email: string,
  ): Promise<{ success: boolean } | void> => {
    await apiFetchJSON<{ success: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (
    token: string,
    password: string,
  ): Promise<{ success: boolean } | void> => {
    await apiFetchJSON<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  getCurrentUser: async (accessToken?: string): Promise<ApiResponse<User>> => {
    const raw = await apiFetchJSON<User | ApiResponse<User>>('/auth/me', {
      method: 'GET',
      accessToken,
    });
    const data = unwrapData(raw);
    return { data, success: true };
  },
};

export const learnerService = {
  getAll: async (
    filters?: FilterOptions,
  ): Promise<PaginatedResponse<Learner>> => {
    const query = buildQuery({
      search: filters?.search,
      status:
        filters?.status && filters.status !== 'all'
          ? filters.status
          : undefined,
      programme:
        filters?.programme && filters.programme !== 'all'
          ? filters.programme
          : undefined,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
    });
    const raw = await apiFetchJSON<unknown>(`/learners${query}`);
    return normalizePaginated<Learner>(raw);
  },

  getById: async (id: string): Promise<ApiResponse<Learner>> => {
    const raw = await apiFetchJSON<ApiResponse<Learner> | Learner>(
      `/learners/${encodeURIComponent(id)}`,
    );
    const data = unwrapData(raw);
    return { data, success: true };
  },

  create: async (data: Partial<Learner>): Promise<ApiResponse<Learner>> => {
    return remotePostJson<Learner>('/learners', data);
  },

  update: async (
    id: string,
    data: Partial<Learner>,
  ): Promise<ApiResponse<Learner>> => {
    return remotePostJson<Learner>(
      `/learners/${encodeURIComponent(id)}`,
      data,
      'PATCH',
    );
  },

  exportPOE: async (
    learnerId: string,
  ): Promise<ApiResponse<{ url: string }>> => {
    return remotePostJson<{ url: string }>(
      `/learners/${encodeURIComponent(learnerId)}/poe-export`,
      {},
    );
  },
};

export const assessmentService = {
  getAll: async (
    filters?: FilterOptions,
  ): Promise<PaginatedResponse<Assessment>> => {
    const query = buildQuery({
      search: filters?.search,
      status:
        filters?.status && filters.status !== 'all'
          ? filters.status
          : undefined,
    });
    const raw = await apiFetchJSON<unknown>(`/assessments${query}`);
    return normalizePaginated<Assessment>(raw);
  },

  getById: async (id: string): Promise<ApiResponse<Assessment>> => {
    const raw = await apiFetchJSON<ApiResponse<Assessment> | Assessment>(
      `/assessments/${encodeURIComponent(id)}`,
    );
    let data = unwrapData(raw) as Assessment;
    if (!data.questions?.length) {
      const qRes = await apiFetchJSON<ApiResponse<Question[]> | Question[]>(
        `/assessments/${encodeURIComponent(id)}/questions`,
      );
      const questions = unwrapData(qRes as ApiResponse<Question[]>);
      data = {
        ...data,
        questions: Array.isArray(questions) ? questions : [],
      };
    }
    return { data, success: true };
  },

  create: async (
    data: Partial<Assessment>,
  ): Promise<ApiResponse<Assessment>> => {
    return remotePostJson<Assessment>('/assessments', data);
  },

  update: async (
    id: string,
    data: Partial<Assessment>,
  ): Promise<ApiResponse<Assessment>> => {
    return remotePostJson<Assessment>(
      `/assessments/${encodeURIComponent(id)}`,
      data,
      'PATCH',
    );
  },

  getQuestions: async (
    assessmentId: string,
  ): Promise<ApiResponse<Question[]>> => {
    const raw = await apiFetchJSON<ApiResponse<Question[]> | Question[]>(
      `/assessments/${encodeURIComponent(assessmentId)}/questions`,
    );
    const list = unwrapData(raw);
    return {
      data: Array.isArray(list) ? list : [],
      success: true,
    };
  },

  submitInstance: async (
    instance: Partial<AssessmentInstance>,
  ): Promise<ApiResponse<AssessmentInstance>> => {
    return remotePostJson<AssessmentInstance>(
      '/assessment-instances',
      instance,
    );
  },

  moderate: async (
    instanceId: string,
    decision: ModerationDecision,
    comments: string,
  ): Promise<ApiResponse<AssessmentInstance>> => {
    return remotePostJson<AssessmentInstance>(
      `/assessment-instances/${encodeURIComponent(instanceId)}/moderate`,
      { decision, comments },
    );
  },

  autoGrade: async (
    responses: QuestionResponse[],
  ): Promise<ApiResponse<QuestionResponse[]>> => {
    return remotePostJson<QuestionResponse[]>('/assessments/auto-grade', {
      responses,
    });
  },

  listInstances: async (
    status?: string,
  ): Promise<ApiResponse<AssessmentInstance[]>> => {
    const query = buildQuery({ status });
    const raw = await apiFetchJSON<
      ApiResponse<AssessmentInstance[]> | AssessmentInstance[]
    >(`/assessment-instances${query}`);
    const list = unwrapData(raw);
    return { data: Array.isArray(list) ? list : [], success: true };
  },

  getInstance: async (
    id: string,
  ): Promise<ApiResponse<AssessmentInstance>> => {
    const raw = await apiFetchJSON<
      ApiResponse<AssessmentInstance> | AssessmentInstance
    >(`/assessment-instances/${encodeURIComponent(id)}`);
    return { data: unwrapData(raw), success: true };
  },
};

export const certificateService = {
  getAll: async (
    enrollmentId?: string,
  ): Promise<ApiResponse<Record<string, unknown>[]>> => {
    const query = buildQuery({ enrollmentId });
    const raw = await apiFetchJSON<
      | ApiResponse<Record<string, unknown>[]>
      | Record<string, unknown>[]
    >(`/certificates${query}`);
    const list = unwrapData(raw);
    return { data: Array.isArray(list) ? list : [], success: true };
  },

  issue: async (body: {
    enrollmentId: string;
    title?: string;
    programmeName?: string;
    learnerName?: string;
  }): Promise<ApiResponse<Record<string, unknown>>> => {
    return remotePostJson<Record<string, unknown>>('/certificates/issue', body);
  },
};

export const poeService = {
  getOverview: async (
    learnerId: string,
  ): Promise<
    ApiResponse<{
      moderatorAssigned: boolean;
      rows: Array<Record<string, unknown>>;
      documents: POEDocument[];
    }>
  > => {
    const raw = await apiFetchJSON<
      | ApiResponse<{
          moderatorAssigned: boolean;
          rows: Array<Record<string, unknown>>;
          documents: POEDocument[];
        }>
      | {
          moderatorAssigned: boolean;
          rows: Array<Record<string, unknown>>;
          documents: POEDocument[];
        }
    >(`/learners/${encodeURIComponent(learnerId)}/poe-overview`);
    const data = unwrapData(raw);
    return { data, success: true };
  },

  getByLearner: async (
    learnerId: string,
  ): Promise<ApiResponse<POEDocument[]>> => {
    const raw = await apiFetchJSON<ApiResponse<POEDocument[]> | POEDocument[]>(
      `/learners/${encodeURIComponent(learnerId)}/poe-documents`,
    );
    const list = unwrapData(raw);
    return {
      data: Array.isArray(list) ? list : [],
      success: true,
    };
  },

  upload: async (
    learnerId: string,
    file: File,
    metadata: Partial<POEDocument>,
  ): Promise<ApiResponse<POEDocument>> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('metadata', JSON.stringify(metadata ?? {}));
    const raw = await apiFetchFormData<ApiResponse<POEDocument> | POEDocument>(
      `/learners/${encodeURIComponent(learnerId)}/poe-documents`,
      fd,
    );
    const data = unwrapData(raw as ApiResponse<POEDocument>);
    return {
      data,
      success: true,
      message: 'Document uploaded successfully',
    };
  },

  verify: async (
    documentId: string,
    verifierId: string,
  ): Promise<ApiResponse<POEDocument>> => {
    return remotePostJson<POEDocument>(
      `/poe-documents/${encodeURIComponent(documentId)}/verify`,
      { verifierId },
    );
  },
};

export const complianceService = {
  getDocuments: async (): Promise<ApiResponse<ComplianceDocument[]>> => {
    const raw = await apiFetchJSON<
      ApiResponse<ComplianceDocument[]> | ComplianceDocument[]
    >('/compliance/documents');
    const list = unwrapData(raw);
    return { data: Array.isArray(list) ? list : [], success: true };
  },

  getSubmissions: async (): Promise<ApiResponse<SETASubmission[]>> => {
    const raw = await apiFetchJSON<
      ApiResponse<SETASubmission[]> | SETASubmission[]
    >('/compliance/seta-submissions');
    const list = unwrapData(raw);
    return { data: Array.isArray(list) ? list : [], success: true };
  },

  uploadDocument: async (
    file: File,
    metadata: Partial<ComplianceDocument>,
  ): Promise<ApiResponse<ComplianceDocument>> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('metadata', JSON.stringify(metadata ?? {}));
    const raw = await apiFetchFormData<
      ApiResponse<ComplianceDocument> | ComplianceDocument
    >('/compliance/documents', fd);
    const data = unwrapData(raw as ApiResponse<ComplianceDocument>);
    return { data, success: true };
  },

  generateNLRD: async (
    programmeId: string,
  ): Promise<ApiResponse<{ batchId: string; xml: string }>> => {
    return remotePostJson<{ batchId: string; xml: string }>(
      '/compliance/nlrd',
      { programmeId },
    );
  },

  exportSETA: async (
    setaId: string,
    format: 'xml' | 'csv' | 'pdf',
  ): Promise<ApiResponse<{ url: string }>> => {
    return remotePostJson<{ url: string }>('/compliance/seta-export', {
      setaId,
      format,
    });
  },
};

export const materialService = {
  getAll: async (
    filters?: FilterOptions,
  ): Promise<PaginatedResponse<TrainingMaterial>> => {
    const query = buildQuery({
      search: filters?.search,
      status:
        filters?.status && filters.status !== 'all'
          ? filters.status
          : undefined,
      programmeId:
        filters?.programme && filters.programme !== 'all'
          ? filters.programme
          : undefined,
      component:
        filters?.poeComponent && filters.poeComponent !== 'all'
          ? filters.poeComponent
          : undefined,
      artifact:
        filters?.artifact && filters.artifact !== 'all'
          ? filters.artifact
          : undefined,
    });
    const raw = await apiFetchJSON<unknown>(`/materials${query}`);
    return normalizePaginated<TrainingMaterial>(raw);
  },

  createRecord: async (
    metadata: Partial<TrainingMaterial>,
  ): Promise<ApiResponse<TrainingMaterial>> => {
    const raw = await apiFetchJSON<ApiResponse<TrainingMaterial> | TrainingMaterial>(
      '/materials/record',
      { method: 'POST', body: JSON.stringify(metadata) },
    );
    return {
      success: true,
      data: unwrapData(raw as ApiResponse<TrainingMaterial>),
    };
  },

  upload: async (
    file: File | null,
    metadata: Partial<TrainingMaterial>,
  ): Promise<ApiResponse<TrainingMaterial>> => {
    const fd = new FormData();
    if (file) fd.append('file', file);
    fd.append('metadata', JSON.stringify(metadata ?? {}));
    const raw = await apiFetchFormData<
      ApiResponse<TrainingMaterial> | TrainingMaterial
    >('/materials', fd);
    const data = unwrapData(raw as ApiResponse<TrainingMaterial>);
    return { data, success: true };
  },
};

export const programmeService = {
  getAll: async (): Promise<ApiResponse<Programme[]>> => {
    const raw = await apiFetchJSON<ApiResponse<Programme[]> | Programme[]>(
      '/programmes',
    );
    const list = unwrapData(raw);
    return {
      data: Array.isArray(list) ? list : [],
      success: true,
    };
  },

  getById: async (id: string): Promise<ApiResponse<Programme>> => {
    const raw = await apiFetchJSON<ApiResponse<Programme> | Programme>(
      `/programmes/${encodeURIComponent(id)}`,
    );
    const data = unwrapData(raw);
    return { data, success: true };
  },

  create: async (
    payload: CreateProgrammePayload,
  ): Promise<ApiResponse<Programme>> => {
    const raw = await apiFetchJSON<ApiResponse<Programme> | Programme>(
      '/programmes',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    const data = unwrapData(raw);
    return { data, success: true };
  },
};

/** Row shape from GET /users (Prisma user + memberships + enrollments). */
export type DirectoryUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  memberships: Array<{
    role: { code: string; name: string };
    organisation: { name: string };
  }>;
  enrollments: Array<{
    programme: { id: string; title: string; code: string };
  }>;
};

export const userService = {
  getAll: async (): Promise<ApiResponse<DirectoryUserRow[]>> => {
    const raw = await apiFetchJSON<
      ApiResponse<DirectoryUserRow[]> | DirectoryUserRow[]
    >('/users');
    const list = unwrapData(raw);
    return {
      data: Array.isArray(list) ? list : [],
      success: true,
    };
  },
};

export type LearnershipProgressRow = {
  status: string;
  _count: { status: number };
};

export const reportsService = {
  getProgress: async (): Promise<ApiResponse<LearnershipProgressRow[]>> => {
    const raw = await apiFetchJSON<
      ApiResponse<LearnershipProgressRow[]> | LearnershipProgressRow[]
    >('/reports/progress');
    const list = unwrapData(raw);
    return {
      data: Array.isArray(list) ? list : [],
      success: true,
    };
  },

  getSetaSnapshot: async (): Promise<
    ApiResponse<{
      enrollments: number;
      docs: number;
      assessments: number;
      generatedAt: string;
    }>
  > => {
    const raw = await apiFetchJSON<
      ApiResponse<{
        enrollments: number;
        docs: number;
        assessments: number;
        generatedAt: string;
      }>
    >('/reports/seta-snapshot');
    const data = unwrapData(raw);
    return { data, success: true };
  },
};

export const attendanceService = {
  list: async (enrollmentId?: string): Promise<ApiResponse<unknown[]>> => {
    const q = buildQuery(
      enrollmentId ? { enrollmentId } : {},
    );
    const raw = await apiFetchJSON<ApiResponse<unknown[]> | unknown[]>(
      `/attendance${q}`,
    );
    const list = unwrapData(raw);
    return { data: Array.isArray(list) ? list : [], success: true };
  },
};

export type CreateEnrollmentPayload = {
  learnerId: string;
  programmeId: string;
  sdioOrganisationId: string;
  employerOrganisationId?: string;
};

export const enrollmentService = {
  create: async (
    payload: CreateEnrollmentPayload,
  ): Promise<ApiResponse<unknown>> => {
    return remotePostJson<unknown>('/enrollments', payload);
  },

  remove: async (enrollmentId: string): Promise<void> => {
    await apiFetchJSON<unknown>(
      `/enrollments/${encodeURIComponent(enrollmentId)}`,
      { method: 'DELETE' },
    );
  },
};

export const messagingService = {
  getConversations: async (): Promise<ApiResponse<Message[]>> => {
    const raw = await apiFetchJSON<ApiResponse<Message[]> | Message[]>(
      '/messages',
    );
    const list = unwrapData(raw);
    return { data: Array.isArray(list) ? list : [], success: true };
  },

  send: async (
    toId: string,
    content: string,
    attachments?: File[],
  ): Promise<ApiResponse<Message>> => {
    if (attachments?.length) {
      const fd = new FormData();
      fd.append('toId', toId);
      fd.append('content', content);
      attachments.forEach((f, i) => {
        fd.append(`attachment_${i}`, f);
      });
      const raw = await apiFetchFormData<ApiResponse<Message> | Message>(
        '/messages',
        fd,
      );
      const data = unwrapData(raw as ApiResponse<Message>);
      return { data, success: true };
    }
    return remotePostJson<Message>('/messages', { toId, content });
  },

  getNotifications: async (): Promise<ApiResponse<Notification[]>> => {
    const raw = await apiFetchJSON<
      ApiResponse<Notification[]> | Notification[]
    >('/notifications');
    const list = unwrapData(raw);
    return {
      data: Array.isArray(list) ? list : [],
      success: true,
    };
  },

  markRead: async (id: string): Promise<ApiResponse<null>> => {
    await apiFetchJSON<unknown>(
      `/notifications/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      },
    );
    return { data: null, success: true };
  },
};

export const auditService = {
  log: async (
    action: string,
    entity: string,
    entityId: string,
    details: string,
  ): Promise<void> => {
    const entry = {
      action,
      entity,
      entityId,
      details,
      at: new Date().toISOString(),
    };
    console.log(`[AUDIT] ${action} ${entity}:${entityId} — ${details}`);
    try {
      await apiFetchJSON<unknown>('/audit/log', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    } catch {
      /* non-blocking */
    }
  },

  list: async (limit = 100): Promise<unknown[]> => {
    try {
      const raw = await apiFetchJSON<unknown>(
        `/audit?limit=${encodeURIComponent(String(limit))}`,
      );
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  },
};

export const api = {
  assessments: {
    submit: async (data: Record<string, unknown>) => {
      const result = await assessmentService.submitInstance(
        data as Partial<AssessmentInstance>,
      );
      return { success: result.success, id: result.data.id };
    },
    moderate: async (
      id: string,
      decision: 'approve' | 'reject' | 'changes',
      comments: string,
    ) => {
      const mapped: ModerationDecision =
        decision === 'changes' ? 'request_changes' : decision;
      const result = await assessmentService.moderate(id, mapped, comments);
      return { success: result.success, status: result.data.status };
    },
  },
  learners: {
    fetch: async () => {
      const result = await learnerService.getAll();
      return result.data.map((l) => ({
        id: l.id,
        name: l.name,
        programme: l.programmeName,
        status: l.status,
      }));
    },
    exportPOE: async (learnerId: string) =>
      learnerService.exportPOE(learnerId).then((r) => r.data),
  },
  messages: {
    send: async (to: string, subject: string, body: string) =>
      messagingService
        .send(to, `${subject}: ${body}`)
        .then((r) => ({ success: r.success, id: r.data.id })),
    fetch: async () =>
      messagingService.getConversations().then((r) =>
        r.data.map((m) => ({
          id: m.id,
          from: m.fromName,
          subject: '',
          body: m.content,
          time: m.createdAt,
          unread: !m.isRead,
        })),
      ),
  },
  nlrd: {
    submit: async (data: Record<string, unknown>) => {
      void data;
      return complianceService
        .generateNLRD('')
        .then((r) => ({ success: r.success, batchId: r.data.batchId }));
    },
  },
  materials: {
    fetch: async () =>
      materialService
        .getAll()
        .then((r) =>
          r.data.map((m) => ({
            id: m.id,
            title: m.title,
            type: m.type,
            size: m.fileSize,
            date: m.createdAt,
          })),
        ),
  },
};
