/**
 * Minimal data for the optional Express reference API (`npm run dev:api`).
 * Prefer the Nest backend + seeded DB for realistic development.
 */
import type {
  User,
  Learner,
  Assessment,
  Programme,
  TrainingMaterial,
  Message,
  Notification,
  ComplianceDocument,
  SETASubmission,
  POEDocument,
  Question,
} from '../src/types';

const stamp = new Date().toISOString();

export const mockUsers: User[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Local Admin',
    email: 'admin@local.test',
    role: 'Admin',
    initials: 'LA',
    organisation: 'Local Dev',
    isActive: true,
    createdAt: stamp,
    updatedAt: stamp,
    lastLoginAt: stamp,
  },
];

export const mockLearners: Learner[] = [];
export const mockAssessments: Assessment[] = [];
export const mockProgrammes: Programme[] = [];
export const mockMaterials: TrainingMaterial[] = [];
export const mockMessages: Message[] = [];
export const mockNotifications: Notification[] = [];
export const mockComplianceDocuments: ComplianceDocument[] = [];
export const mockSETASubmissions: SETASubmission[] = [];
export const mockPOEDocuments: POEDocument[] = [];
export const sampleQuestions: Question[] = [];
