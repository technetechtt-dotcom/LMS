import { PoeWorkflowService } from './poe-workflow.service';

describe('PoeWorkflowService.enrollmentReadyForCertificate', () => {
  it('requires both WORKBOOK and SUMMATIVE approved independently', async () => {
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'e1',
          status: 'COMPLETED',
        }),
      },
      assessment: {
        findMany: jest.fn().mockResolvedValue([{ result: 'C' }]),
      },
      poeLearningArtifact: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'wb' }) // WORKBOOK ok
          .mockResolvedValueOnce(null), // SUMMATIVE missing
      },
    };
    const svc = new PoeWorkflowService(prisma as never);
    const gate = await svc.enrollmentReadyForCertificate('e1');
    expect(gate.ready).toBe(false);
    expect(gate.reasons.some((r) => r.includes('SUMMATIVE'))).toBe(true);
  });

  it('is ready when both artefacts approved and assessments C', async () => {
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'e1',
          status: 'COMPLETED',
        }),
      },
      assessment: {
        findMany: jest.fn().mockResolvedValue([{ result: 'C' }]),
      },
      poeLearningArtifact: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'wb' })
          .mockResolvedValueOnce({ id: 'sum' }),
      },
    };
    const svc = new PoeWorkflowService(prisma as never);
    const gate = await svc.enrollmentReadyForCertificate('e1');
    expect(gate.ready).toBe(true);
    expect(gate.reasons).toEqual([]);
  });
});
