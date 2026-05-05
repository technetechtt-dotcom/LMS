import type { CreateProgrammePayload, Programme } from '../types';

export function createProgrammeRecord(
  input: CreateProgrammePayload,
  idFactory: () => string = () => `p-new-${Date.now()}`,
): Programme {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: idFactory(),
    title: input.title.trim(),
    code: input.code.trim(),
    programmeKind: input.programmeKind,
    nqfLevel: input.nqfLevel,
    credits: input.credits,
    seta: input.seta,
    status: input.status ?? 'draft',
    description: input.description.trim() || '—',
    modules: [],
    facilitatorIds: ['u1'],
    learnerCount: 0,
    completionRate: 0,
    createdAt: now,
    updatedAt: now,
  };
}
