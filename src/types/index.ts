// ============================================================
// CORE TYPES — SkillForge SA Learning Management System
// ============================================================

// --- Enums & Unions ---

export type UserRole =
'Admin' |
'Facilitator' |
'Learner' |
'Assessor' |
'Moderator' |
'QA Officer' |
'SETA Official' |
'Workplace Mentor';

/** SDP-assigned facilitator capacity (only meaningful when `role === 'Facilitator'`). */
export type FacilitatorRole =
  | 'lead_facilitator'
  | 'assistant_facilitator'
  | 'subject_specialist'
  | 'workplace_coordinator';

export type AssessmentStatus =
'draft' |
'active' |
'scheduled' |
'overdue' |
'completed' |
'archived';

export type AssessmentInstanceStatus =
'not_started' |
'in_progress' |
'submitted' |
'grading' |
'moderation' |
'completed' |
'rejected';

export type QuestionType =
'multiple_choice' |
'multiple_select' |
'true_false' |
'short_answer' |
'essay' |
'file_upload' |
'rubric';

export type SETAComplianceStatus =
'compliant' |
'partially_compliant' |
'non_compliant' |
'pending';

export type DocumentStatus =
'verified' |
'pending_review' |
'missing' |
'expiring_soon' |
'expired';

export type POEStatus =
'draft' |
'submitted' |
'verified' |
'rejected' |
'archived';

export type SubmissionStatus =
'submitted' |
'pending' |
'overdue' |
'upcoming' |
'accepted' |
'rejected';

export type NotificationType =
'assessment' |
'compliance' |
'system' |
'moderation' |
'message' |
'deadline';

export type MaterialType =
'video' |
'pdf' |
'interactive' |
'audio' |
'document';

export type ModerationDecision = 'approve' | 'reject' | 'request_changes';

export type AuditAction =
'create' |
'update' |
'delete' |
'submit' |
'approve' |
'reject' |
'export' |
'login' |
'logout';

// --- Base Interfaces ---

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// --- User & Auth ---

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  organisation: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  /** Facilitator job capacity assigned by the SDP (optional). */
  facilitatorRole?: FacilitatorRole;
  /** Present when the account is a learner: current enrollment id (for `/learner/:id`). */
  linkedLearnerId?: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// --- Learner ---

export interface Learner extends BaseEntity {
  userId: string;
  name: string;
  email: string;
  idNumber: string;
  phone?: string;
  programmeId: string;
  programmeName: string;
  nqfLevel: string;
  progress: number;
  setaStatus: SETAComplianceStatus;
  enrollmentDate: string;
  expectedCompletionDate: string;
  status: 'active' | 'completed' | 'withdrawn' | 'at_risk';
  lastActivity: string;
  lastActivityDescription: string;
  avatarUrl?: string;
  /** Recorded competency assessments for this enrolment (competent / total). */
  assessmentTotal?: number;
  assessmentCompetent?: number;
}

// --- Facilitator ---

export interface Facilitator extends BaseEntity {
  userId: string;
  name: string;
  email: string;
  qualifications: string[];
  programmeIds: string[];
  learnerCount: number;
  isAccredited: boolean;
  accreditationExpiry?: string;
}

// --- Programme & Module ---

/** SDP classification — aligned with Prisma `ProgrammeKind` for API/DB. */
export type ProgrammeKind = 'SKILLS_PROGRAMME' | 'OCCUPATIONAL_PROGRAMME';

/** Fields collected in the “New programme” flow (UI + reference API). */
export interface CreateProgrammePayload {
  title: string;
  code: string;
  programmeKind: ProgrammeKind;
  nqfLevel: number;
  credits: number;
  seta: string;
  description: string;
  status?: Programme['status'];
}

export interface Programme extends BaseEntity {
  organisationId?: string;
  title: string;
  code: string;
  /** Skills programme vs occupational programme */
  programmeKind: ProgrammeKind;
  nqfLevel: number;
  credits: number;
  seta: string;
  status: 'active' | 'archived' | 'draft';
  description: string;
  modules: Module[];
  facilitatorIds: string[];
  learnerCount: number;
  completionRate: number;
}

export interface Module extends BaseEntity {
  title: string;
  code: string;
  programmeId: string;
  order: number;
  credits: number;
  assessmentIds: string[];
  materialIds: string[];
  description: string;
}

// --- Assessment ---

export interface Assessment extends BaseEntity {
  title: string;
  moduleId: string;
  moduleName: string;
  programmeId: string;
  programmeName: string;
  /** Competency assessment: enrolment record id (same as learner directory id). */
  enrollmentId?: string;
  learnerName?: string;
  assessorId?: string;
  assessedAt?: string;
  /** True when no moderator record exists yet (competency assessments). */
  needsModeration?: boolean;
  type: 'quiz' | 'practical' | 'portfolio' | 'oral' | 'mixed';
  format: string;
  status: AssessmentStatus;
  isPublished: boolean;
  dueDate?: string;
  scheduledDate?: string;
  timeLimit?: number; // minutes
  passMark: number;
  totalMarks: number;
  questionCount: number;
  questions: Question[];
  rubricCriteria: RubricCriterion[];
  attempts: number;
  totalLearners: number;
  passRate?: number;
  avgScore?: number;
  isAIGenerated: boolean;
  createdBy: string;
}

export interface AssessmentInstance extends BaseEntity {
  learnerId: string;
  learnerName: string;
  assessmentId: string;
  assessmentTitle: string;
  status: AssessmentInstanceStatus;
  startedAt?: string;
  submittedAt?: string;
  gradedAt?: string;
  score?: number;
  percentage?: number;
  isPassed?: boolean;
  responses: QuestionResponse[];
  moderationRecord?: ModerationRecord;
  feedback?: string;
  gradedBy?: string;
}

// --- Questions ---

export interface QuestionBase extends BaseEntity {
  assessmentId: string;
  type: QuestionType;
  content: string;
  explanation?: string;
  points: number;
  order: number;
  isRequired: boolean;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple_choice';
  options: QuestionOption[];
  correctOptionId: string;
}

export interface MultipleSelectQuestion extends QuestionBase {
  type: 'multiple_select';
  options: QuestionOption[];
  correctOptionIds: string[];
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true_false';
  correctAnswer: boolean;
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: 'short_answer';
  sampleAnswer?: string;
  maxLength: number;
}

export interface EssayQuestion extends QuestionBase {
  type: 'essay';
  sampleAnswer?: string;
  wordLimit?: number;
  rubricCriteria?: RubricCriterion[];
}

export interface FileUploadQuestion extends QuestionBase {
  type: 'file_upload';
  acceptedTypes: string[];
  maxFileSize: number; // MB
  instructions: string;
}

export interface RubricQuestion extends QuestionBase {
  type: 'rubric';
  criteria: RubricCriterion[];
}

export type Question =
MultipleChoiceQuestion |
MultipleSelectQuestion |
TrueFalseQuestion |
ShortAnswerQuestion |
EssayQuestion |
FileUploadQuestion |
RubricQuestion;

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface RubricCriterion {
  id: string;
  description: string;
  maxScore: number;
  levels?: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
}

// --- Question Response ---

export interface QuestionResponse {
  questionId: string;
  questionType: QuestionType;
  answer: string | string[] | boolean | null;
  fileUrl?: string;
  fileName?: string;
  score?: number;
  maxScore: number;
  isCorrect?: boolean;
  feedback?: string;
  rubricScores?: Record<string, number>;
  answeredAt: string;
}

// --- Moderation ---

export interface ModerationRecord extends BaseEntity {
  assessmentInstanceId: string;
  moderatorId: string;
  moderatorName: string;
  decision: ModerationDecision;
  comments: string;
  adjustedScore?: number;
  moderatedAt: string;
}

// --- POE (Portfolio of Evidence) ---

export interface POEDocument extends BaseEntity {
  learnerId: string;
  learnerName: string;
  type: string;
  category: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  mimeType: string;
  status: POEStatus;
  version: number;
  versionHistory: POEVersion[];
  verifiedBy?: string;
  verifiedAt?: string;
  comments?: string;
}

export interface POEVersion {
  version: number;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  comments?: string;
}

// --- Documents & Compliance ---

export interface ComplianceDocument extends BaseEntity {
  name: string;
  category: string;
  status: DocumentStatus;
  lastUpdated: string;
  expiryDate?: string;
  fileUrl?: string;
  uploadedBy?: string;
}

export interface SETASubmission extends BaseEntity {
  type: string;
  reference: string;
  dueDate: string;
  status: SubmissionStatus;
  submittedBy?: string;
  submittedAt?: string;
  setaResponse?: string;
  fileUrl?: string;
}

export interface AuditRecord extends BaseEntity {
  type: string;
  reference: string;
  date: string;
  status: 'completed' | 'scheduled' | 'in_progress';
  conductedBy: string;
  outcome?: string;
  outcomeStatus?: SETAComplianceStatus;
  reportUrl?: string;
}

// --- Materials ---

export interface TrainingMaterial extends BaseEntity {
  title: string;
  programmeId: string;
  programmeName: string;
  moduleId: string;
  moduleName: string;
  type: MaterialType;
  format: string;
  duration?: string;
  pageCount?: number;
  fileUrl: string;
  fileSize: string;
  thumbnailUrl?: string;
  viewCount: number;
  downloadCount: number;
  completionCount: number;
  isApproved: boolean;
  isAIEnhanced: boolean;
  uploadedBy: string;
  /** e.g. KM-XX — optional for legacy materials */
  moduleCode?: string;
  /** Stable key: learner-guide | learner-workbook | summative | other | na */
  artifactSlug?: string;
  /** Display label for artefact slot in KM triplet */
  artifactType?: string;
  /** Knowledge | Assessment | Practical | Workplace | Compliance */
  poeComponent?: string;
  /** Library list blurb */
  description?: string;
}

// --- Communication ---

export interface Message extends BaseEntity {
  fromId: string;
  fromName: string;
  fromRole: UserRole;
  toId: string;
  toName: string;
  content: string;
  isRead: boolean;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  mimeType: string;
}

export interface Announcement extends BaseEntity {
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  audience: string;
  authorId: string;
  authorName: string;
  isPublished: boolean;
  publishedAt?: string;
}

export interface CommunicationGroup extends BaseEntity {
  name: string;
  type: 'learnership' | 'staff' | 'external';
  programmeId?: string;
  programmeName?: string;
  memberCount: number;
  description?: string;
  lastActivity: string;
}

// --- Notifications ---

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  actionUrl?: string;
  icon?: string;
}

// --- Audit Log ---

export interface AuditLog extends BaseEntity {
  userId: string;
  userName: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

// --- API Response Types ---

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// --- Dashboard Stats ---

export interface DashboardStat {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: string;
}

// --- Filter & Sort ---

export interface FilterOptions {
  search?: string;
  status?: string;
  /** Programme UUID — library materials are scoped and sorted by programme */
  programme?: string;
  /** PoE component filter for learning library: knowledge | assessment | practical | workplace | compliance */
  poeComponent?: string;
  /** KM filter: km-only | learner-guide | learner-workbook | summative | other */
  artifact?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}