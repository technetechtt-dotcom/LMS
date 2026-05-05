/**
 * Reference API for local full-stack dev — mirrors the contract in `.env.example`.
 * Run: npm run dev:api   (default http://localhost:8787)
 */
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type {
  CreateProgrammePayload,
  MaterialType,
  TrainingMaterial,
  User,
} from '../src/types';
import { createProgrammeRecord } from '../src/utils/programmeFactory';
import {
  mockUsers,
  mockLearners,
  mockAssessments,
  mockProgrammes,
  mockMaterials,
  mockMessages,
  mockNotifications,
  mockComplianceDocuments,
  mockSETASubmissions,
  mockPOEDocuments,
  sampleQuestions,
} from './miniFixtures';

const PORT = Number(process.env.PORT) || 8787;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

function pid(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

const sessions = new Map<string, string>(); // token -> userId
const upload = multer({ storage: multer.memoryStorage() });

const learners = structuredClone(mockLearners);
const assessments = structuredClone(mockAssessments);
const programmes = structuredClone(mockProgrammes);
const materials: TrainingMaterial[] = structuredClone(mockMaterials);

const ARTIFACT_LABEL: Record<string, string> = {
  'learner-guide': 'Learner Guide',
  'learner-workbook': 'Learner Workbook',
  summative: 'Summative Assessment',
  other: '—',
  na: '—',
};

function normalizeArtifactSlug(slug?: string): string {
  if (!slug || slug === 'na') return 'other';
  return slug;
}

function coerceMaterialType(t: unknown, format: string): MaterialType {
  const valid: MaterialType[] = ['video', 'pdf', 'interactive', 'audio', 'document'];
  if (typeof t === 'string' && (valid as string[]).includes(t)) return t as MaterialType;
  const f = format.toLowerCase();
  if (f.includes('mp4') || f.includes('video')) return 'video';
  if (f.includes('scorm')) return 'interactive';
  if (f.includes('ppt')) return 'document';
  if (f.includes('doc')) return 'document';
  return 'pdf';
}

function resolveProgrammeForMaterial(meta: Partial<TrainingMaterial>): { id: string; name: string } {
  const id = typeof meta.programmeId === 'string' && meta.programmeId.trim() ? meta.programmeId.trim() : '';
  if (!id) {
    throw new Error('programmeId is required');
  }
  const p = programmes.find((x) => x.id === id);
  if (!p) {
    throw new Error('Programme not found for this programmeId');
  }
  return { id: p.id, name: p.title };
}

function buildMaterialRecord(
  meta: Partial<TrainingMaterial>,
  file: Express.Multer.File | undefined,
  auth: User | undefined,
): TrainingMaterial {
  const now = new Date().toISOString();
  const prog = resolveProgrammeForMaterial(meta);
  const slug = normalizeArtifactSlug(meta.artifactSlug);
  const format =
    (typeof meta.format === 'string' && meta.format.trim()) ||
    (file?.mimetype?.includes('video') ? 'MP4' : file?.mimetype?.includes('pdf') ? 'PDF' : 'PDF');
  const title =
    (typeof meta.title === 'string' && meta.title.trim()) ||
    (file?.originalname ? file.originalname.replace(/\.[^.]+$/, '') : '') ||
    'Untitled';
  const moduleCode =
    typeof meta.moduleCode === 'string' && meta.moduleCode.trim()
      ? meta.moduleCode.trim()
      : '—';
  const poeComponent =
    typeof meta.poeComponent === 'string' && meta.poeComponent.trim()
      ? meta.poeComponent.trim()
      : slug === 'learner-workbook' || slug === 'summative'
        ? 'Assessment'
        : 'Knowledge';
  const artifactType =
    typeof meta.artifactType === 'string' && meta.artifactType.trim()
      ? meta.artifactType.trim()
      : ARTIFACT_LABEL[slug] ?? '—';
  const fileUrl =
    file != null
      ? `/materials/${encodeURIComponent(file.originalname)}`
      : typeof meta.fileUrl === 'string' && meta.fileUrl
        ? meta.fileUrl
        : '/materials/placeholder';
  const fileSize =
    file != null
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : typeof meta.fileSize === 'string'
        ? meta.fileSize
        : '0 KB';

  return {
    id: `tm${Date.now()}-${randomUUID().slice(0, 8)}`,
    title,
    description: typeof meta.description === 'string' ? meta.description : undefined,
    programmeId: prog.id,
    programmeName: prog.name,
    moduleId: typeof meta.moduleId === 'string' ? meta.moduleId : 'm1',
    moduleName: typeof meta.moduleName === 'string' ? meta.moduleName : 'Module 1',
    moduleCode,
    artifactSlug: slug,
    artifactType,
    poeComponent,
    type: coerceMaterialType(meta.type, format),
    format: format.toUpperCase(),
    duration: meta.duration,
    pageCount: meta.pageCount,
    fileUrl,
    fileSize,
    thumbnailUrl: meta.thumbnailUrl,
    viewCount: typeof meta.viewCount === 'number' ? meta.viewCount : 0,
    downloadCount: typeof meta.downloadCount === 'number' ? meta.downloadCount : 0,
    completionCount: typeof meta.completionCount === 'number' ? meta.completionCount : 0,
    isApproved: meta.isApproved !== false,
    isAIEnhanced: Boolean(meta.isAIEnhanced),
    uploadedBy: typeof meta.uploadedBy === 'string' ? meta.uploadedBy : auth?.id ?? 'u1',
    createdAt: now,
    updatedAt: now,
  };
}

function applyMaterialFilters(
  rows: TrainingMaterial[],
  search?: string,
  component?: string,
  artifact?: string,
  programmeId?: string,
): TrainingMaterial[] {
  let out = [...rows];
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    out = out.filter((m) => {
      const blob = `${m.title} ${m.description ?? ''} ${m.programmeName} ${m.moduleCode ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }
  if (programmeId && programmeId !== 'all') {
    out = out.filter((m) => m.programmeId === programmeId);
  }
  if (component && component !== 'all') {
    const c = component.toLowerCase();
    out = out.filter((m) => (m.poeComponent ?? '').toLowerCase() === c);
  }
  if (artifact && artifact !== 'all') {
    if (artifact === 'km-only') {
      out = out.filter((m) => (m.moduleCode ?? '').startsWith('KM-'));
    } else if (artifact === 'other') {
      out = out.filter((m) => normalizeArtifactSlug(m.artifactSlug) === 'other');
    } else {
      out = out.filter((m) => normalizeArtifactSlug(m.artifactSlug) === artifact);
    }
  }
  return out;
}

function sortMaterialsByProgramme(rows: TrainingMaterial[]): TrainingMaterial[] {
  return [...rows].sort((a, b) => {
    const byP = a.programmeName.localeCompare(b.programmeName, undefined, { sensitivity: 'base' });
    if (byP !== 0) return byP;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}
const messages = structuredClone(mockMessages);
const notifications = structuredClone(mockNotifications);
const complianceDocs = structuredClone(mockComplianceDocuments);
const setaSubmissions = structuredClone(mockSETASubmissions);
const poeDocuments = structuredClone(mockPOEDocuments);

const assessmentInstances: Record<string, unknown>[] = [];

function findUserByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return mockUsers.find((u) => u.email.toLowerCase() === e);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const token = h.slice(7);
  const userId = sessions.get(token);
  if (!userId) {
    res.status(401).json({ message: 'Invalid session' });
    return;
  }
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  (req as Request & { authUser: User }).authUser = user;
  next();
}

const app = express();
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));

// --- Auth (public) ---
app.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ message: 'Invalid credentials' });
    return;
  }
  const user = findUserByEmail(String(email));
  if (!user) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }
  const accessToken = randomUUID();
  sessions.set(accessToken, user.id);
  res.json({ user, accessToken });
});

app.post('/auth/logout', (req: Request, res: Response) => {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) sessions.delete(h.slice(7));
  res.json({ success: true, data: null });
});

app.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  const u = (req as Request & { authUser: User }).authUser;
  res.json(u);
});

app.post('/audit/log', (_req: Request, res: Response) => {
  res.status(204).send();
});

// --- Learners ---
app.get('/learners', requireAuth, (req: Request, res: Response) => {
  const { search, status, programme, dateFrom, dateTo } = req.query;
  let rows = [...learners];
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    rows = rows.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q),
    );
  }
  if (programme && typeof programme === 'string' && programme !== 'all') {
    rows = rows.filter((l) => l.programmeId === programme);
  }
  if (dateFrom && typeof dateFrom === 'string') {
    rows = rows.filter((l) => l.enrollmentDate >= dateFrom);
  }
  if (dateTo && typeof dateTo === 'string') {
    rows = rows.filter((l) => l.enrollmentDate <= dateTo);
  }
  if (status && typeof status === 'string' && status !== 'all') {
    if (status === 'completed') rows = rows.filter((l) => l.status === 'completed');
    else if (status === 'active')
      rows = rows.filter((l) => l.status !== 'completed');
    else if (status === 'at-risk')
      rows = rows.filter(
        (l) => l.status === 'at_risk' || (l.progress ?? 0) < 50,
      );
    else if (status === 'on-track')
      rows = rows.filter(
        (l) =>
          l.status !== 'at_risk' &&
          (l.progress ?? 0) >= 50 &&
          (l.progress ?? 0) >= 80,
      );
    else rows = rows.filter((l) => l.status === status);
  }
  /** Optional `Assessment.enrollmentId` links templates to an enrolment (usually empty in mini fixtures). */
  const withAssessments = rows.map((l) => {
    const rel = assessments.filter((a) => a.enrollmentId === l.id);
    return {
      ...l,
      assessmentTotal: rel.length,
      assessmentCompetent: rel.filter((a) => a.status === 'completed').length,
    };
  });
  res.json({
    data: withAssessments,
    total: withAssessments.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
});

app.get('/learners/:id', requireAuth, (req: Request, res: Response) => {
  const row = learners.find((l) => l.id === pid(req.params.id));
  if (!row) {
    res.status(404).json({ message: 'Learner not found' });
    return;
  }
  const rel = assessments.filter((a) => a.enrollmentId === row.id);
  res.json({
    ...row,
    assessmentTotal: rel.length,
    assessmentCompetent: rel.filter((a) => a.status === 'completed').length,
  });
});

app.post('/learners', requireAuth, (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const row = {
    ...(req.body ?? {}),
    id: `l${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  learners.push(row as (typeof learners)[0]);
  res.json({ success: true, data: row, message: 'Learner created' });
});

app.patch('/learners/:id', requireAuth, (req: Request, res: Response) => {
  const i = learners.findIndex((l) => l.id === pid(req.params.id));
  if (i < 0) {
    res.status(404).json({ message: 'Learner not found' });
    return;
  }
  const updated = {
    ...learners[i],
    ...(req.body ?? {}),
    updatedAt: new Date().toISOString(),
  };
  learners[i] = updated;
  res.json({ success: true, data: updated, message: 'Learner updated' });
});

app.post('/learners/:learnerId/poe-export', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      url: `/exports/poe-${encodeURIComponent(pid(req.params.learnerId))}.pdf`,
    },
  });
});

// --- POE ---
app.get(
  '/learners/:learnerId/poe-documents',
  requireAuth,
  (req: Request, res: Response) => {
    const list = poeDocuments.filter((p) => p.learnerId === pid(req.params.learnerId));
    res.json({ success: true, data: list });
  },
);

app.post(
  '/learners/:learnerId/poe-documents',
  requireAuth,
  upload.single('file'),
  (req: Request, res: Response) => {
    let meta: Record<string, unknown> = {};
    try {
      if (typeof req.body.metadata === 'string')
        meta = JSON.parse(req.body.metadata) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    const file = req.file;
    const now = new Date().toISOString();
    const doc = {
      ...meta,
      id: `poe${Date.now()}`,
      learnerId: pid(req.params.learnerId),
      learnerName: '',
      type: (meta.type as string) || 'Evidence',
      category: (meta.category as string) || 'General',
      fileName: file?.originalname || 'upload.bin',
      fileUrl: `/files/${file?.originalname || 'upload.bin'}`,
      fileSize: file
        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
        : '0 MB',
      mimeType: file?.mimetype || 'application/octet-stream',
      status: 'submitted',
      version: 1,
      versionHistory: [
        {
          version: 1,
          fileUrl: `/files/${file?.originalname}`,
          fileName: file?.originalname,
          uploadedAt: now,
          uploadedBy: pid(req.params.learnerId),
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    poeDocuments.push(doc as (typeof poeDocuments)[0]);
    res.json({ success: true, data: doc, message: 'Document uploaded' });
  },
);

app.post(
  '/poe-documents/:documentId/verify',
  requireAuth,
  (req: Request, res: Response) => {
    const { verifierId } = req.body ?? {};
    res.json({
      success: true,
      data: {
        id: pid(req.params.documentId),
        status: 'verified',
        verifiedBy: verifierId,
        verifiedAt: new Date().toISOString(),
      },
    });
  },
);

// --- Assessments ---
function questionsForAssessment(id: string) {
  return sampleQuestions.filter((q) => q.assessmentId === id);
}

app.get('/assessments', requireAuth, (req: Request, res: Response) => {
  const { search, status } = req.query;
  let rows = [...assessments];
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    rows = rows.filter((a) => a.title.toLowerCase().includes(q));
  }
  if (status && typeof status === 'string' && status !== 'all') {
    rows = rows.filter((a) => a.status === status);
  }
  res.json({
    data: rows,
    total: rows.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
});

app.get('/assessments/:id', requireAuth, (req: Request, res: Response) => {
  const row = assessments.find((a) => a.id === pid(req.params.id));
  if (!row) {
    res.status(404).json({ message: 'Assessment not found' });
    return;
  }
  const qs = questionsForAssessment(row.id);
  res.json({ ...row, questions: qs.length ? qs : row.questions });
});

app.get('/assessments/:id/questions', requireAuth, (req: Request, res: Response) => {
  const row = assessments.find((a) => a.id === pid(req.params.id));
  if (!row) {
    res.status(404).json({ message: 'Assessment not found' });
    return;
  }
  res.json({
    success: true,
    data: questionsForAssessment(pid(req.params.id)),
  });
});

app.post('/assessments', requireAuth, (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const row = {
    ...(req.body ?? {}),
    id: `a${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  assessments.push(row as (typeof assessments)[0]);
  res.json({ success: true, data: row, message: 'Assessment created' });
});

app.patch('/assessments/:id', requireAuth, (req: Request, res: Response) => {
  const i = assessments.findIndex((a) => a.id === pid(req.params.id));
  if (i < 0) {
    res.status(404).json({ message: 'Assessment not found' });
    return;
  }
  const updated = {
    ...assessments[i],
    ...(req.body ?? {}),
    updatedAt: new Date().toISOString(),
  };
  assessments[i] = updated;
  res.json({ success: true, data: updated });
});

app.post('/assessment-instances', requireAuth, (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const row = {
    ...(req.body ?? {}),
    id: `ai${Date.now()}`,
    status: 'submitted',
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  assessmentInstances.push(row);
  res.json({ success: true, data: row, message: 'Submitted' });
});

app.post(
  '/assessment-instances/:id/moderate',
  requireAuth,
  (req: Request, res: Response) => {
    const { decision } = req.body ?? {};
    const st =
      decision === 'approve'
        ? 'completed'
        : decision === 'reject'
          ? 'rejected'
          : 'grading';
    res.json({
      success: true,
      data: {
        id: pid(req.params.id),
        status: st,
      },
      message: 'Moderated',
    });
  },
);

app.post('/assessments/auto-grade', requireAuth, (req: Request, res: Response) => {
  const responses = (req.body?.responses ?? []) as {
    questionType?: string;
    maxScore?: number;
  }[];
  const graded = responses.map((r) => {
    if (r.questionType === 'multiple_choice' || r.questionType === 'true_false') {
      return {
        ...r,
        isCorrect: Math.random() > 0.3,
        score: Math.random() > 0.3 ? r.maxScore ?? 0 : 0,
      };
    }
    return r;
  });
  res.json({ success: true, data: graded });
});

// --- Programmes ---
app.get('/programmes', requireAuth, (_req: Request, res: Response) => {
  res.json({ success: true, data: programmes });
});

app.get('/programmes/:id', requireAuth, (req: Request, res: Response) => {
  const row = programmes.find((p) => p.id === pid(req.params.id));
  if (!row) {
    res.status(404).json({ message: 'Programme not found' });
    return;
  }
  res.json(row);
});

app.post('/programmes', requireAuth, (req: Request, res: Response) => {
  const body = req.body as Partial<CreateProgrammePayload>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!title || !code) {
    res.status(400).json({ message: 'title and code are required' });
    return;
  }
  const programmeKind =
    body.programmeKind === 'SKILLS_PROGRAMME' ||
    body.programmeKind === 'OCCUPATIONAL_PROGRAMME'
      ? body.programmeKind
      : 'OCCUPATIONAL_PROGRAMME';
  const nqfLevel =
    typeof body.nqfLevel === 'number' &&
    Number.isFinite(body.nqfLevel) &&
    body.nqfLevel >= 1 &&
    body.nqfLevel <= 10
      ? Math.floor(body.nqfLevel)
      : 4;
  const credits =
    typeof body.credits === 'number' &&
    Number.isFinite(body.credits) &&
    body.credits > 0
      ? Math.floor(body.credits)
      : 120;
  const seta =
    typeof body.seta === 'string' && body.seta.trim()
      ? body.seta.trim()
      : 'MICT SETA';
  const description =
    typeof body.description === 'string' ? body.description : '';
  const status =
    body.status === 'active' ||
    body.status === 'draft' ||
    body.status === 'archived'
      ? body.status
      : 'draft';

  const row = createProgrammeRecord(
    {
      title,
      code,
      programmeKind,
      nqfLevel,
      credits,
      seta,
      description,
      status,
    },
    () => `p-${randomUUID().replace(/-/g, '').slice(0, 12)}`,
  );
  programmes.push(row);
  res.status(201).json({ success: true, data: row });
});

// --- Materials ---
app.get('/materials', requireAuth, (req: Request, res: Response) => {
  const { search, component, artifact, programmeId } = req.query;
  const filtered = applyMaterialFilters(
    materials,
    typeof search === 'string' ? search : undefined,
    typeof component === 'string' ? component : undefined,
    typeof artifact === 'string' ? artifact : undefined,
    typeof programmeId === 'string' ? programmeId : undefined,
  );
  const rows = sortMaterialsByProgramme(filtered);
  res.json({
    data: rows,
    total: rows.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
});

app.post('/materials/record', requireAuth, (req: Request, res: Response) => {
  const auth = (req as Request & { authUser: User }).authUser;
  const meta = (req.body ?? {}) as Partial<TrainingMaterial>;
  try {
    const row = buildMaterialRecord(meta, undefined, auth);
    materials.push(row);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({
      message: e instanceof Error ? e.message : 'Invalid learning material',
    });
  }
});

app.post('/materials', requireAuth, upload.single('file'), (req: Request, res: Response) => {
  const auth = (req as Request & { authUser: User }).authUser;
  let meta: Partial<TrainingMaterial> = {};
  try {
    if (typeof req.body.metadata === 'string')
      meta = JSON.parse(req.body.metadata) as Partial<TrainingMaterial>;
  } catch {
    /* ignore */
  }
  try {
    const row = buildMaterialRecord(meta, req.file, auth);
    materials.push(row);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({
      message: e instanceof Error ? e.message : 'Invalid learning material',
    });
  }
});

// --- Compliance ---
app.get('/compliance/documents', requireAuth, (_req: Request, res: Response) => {
  res.json({ success: true, data: complianceDocs });
});

app.get('/compliance/seta-submissions', requireAuth, (_req: Request, res: Response) => {
  res.json({ success: true, data: setaSubmissions });
});

app.post('/compliance/documents', requireAuth, upload.single('file'), (req: Request, res: Response) => {
  let meta: Record<string, unknown> = {};
  try {
    if (typeof req.body.metadata === 'string')
      meta = JSON.parse(req.body.metadata) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const row = {
    ...meta,
    id: `cd${Date.now()}`,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  complianceDocs.push(row as (typeof complianceDocs)[0]);
  res.json({ success: true, data: row });
});

app.post('/compliance/nlrd', requireAuth, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { batchId: `NLRD-${Date.now()}`, xml: '<?xml version="1.0"?><nlrd/>' },
    message: 'NLRD export generated',
  });
});

app.post('/compliance/seta-export', requireAuth, (req: Request, res: Response) => {
  const { setaId, format } = req.body ?? {};
  res.json({
    success: true,
    data: {
      url: `/exports/seta-${String(setaId)}.${String(format || 'xml')}`,
    },
  });
});

// --- Messages ---
app.get('/messages', requireAuth, (_req: Request, res: Response) => {
  res.json({ success: true, data: messages });
});

app.post(
  '/messages',
  requireAuth,
  upload.any(),
  (req: Request, res: Response) => {
    const auth = (req as Request & { authUser: User }).authUser;
    const isMultipart = req.files && Array.isArray(req.files) && req.files.length > 0;

    const toId =
      (isMultipart ? req.body.toId : (req.body ?? {}).toId) || '';
    const content =
      (isMultipart ? req.body.content : (req.body ?? {}).content) || '';

    const toUser = mockUsers.find((u) => u.id === toId);
    const msg = {
      id: `msg${Date.now()}`,
      fromId: auth.id,
      fromName: auth.name,
      fromRole: auth.role,
      toId,
      toName: toUser?.name ?? 'Recipient',
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    messages.push(msg as (typeof messages)[0]);
    res.json({ success: true, data: msg });
  },
);

// --- Notifications ---
app.get('/notifications', requireAuth, (_req: Request, res: Response) => {
  res.json({ success: true, data: notifications });
});

app.patch('/notifications/:id', requireAuth, (req: Request, res: Response) => {
  const n = notifications.find((x) => x.id === pid(req.params.id));
  if (n && req.body?.read === true) n.read = true;
  res.json({ success: true, data: null });
});

app.listen(PORT, () => {
  console.log(`SkillForge reference API on http://localhost:${PORT}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
});
