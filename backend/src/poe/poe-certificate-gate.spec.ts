import { PoeWorkflowService } from './poe-workflow.service';

describe('PoeWorkflowService.enrollmentReadyForCertificate', () => {
  it('fails when lifecycle not COMPLETED even if requirements pass', async () => {
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'e1',
          status: 'ASSESSMENT',
        }),
      },
    };
    const completion = {
      evaluate: jest.fn().mockResolvedValue({ ready: true, reasons: [], checks: {} }),
    };
    const svc = new PoeWorkflowService(prisma as never, completion as never);
    const gate = await svc.enrollmentReadyForCertificate('e1');
    expect(gate.ready).toBe(false);
    expect(gate.reasons.some((r) => r.includes('COMPLETED'))).toBe(true);
  });

  it('merges programme completion requirement failures', async () => {
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'e1',
          status: 'COMPLETED',
        }),
      },
    };
    const completion = {
      evaluate: jest.fn().mockResolvedValue({
        ready: false,
        reasons: ['Missing approved SUMMATIVE PoE artefact'],
        checks: {},
      }),
    };
    const svc = new PoeWorkflowService(prisma as never, completion as never);
    const gate = await svc.enrollmentReadyForCertificate('e1');
    expect(gate.ready).toBe(false);
    expect(gate.reasons.some((r) => r.includes('SUMMATIVE'))).toBe(true);
  });

  it('is ready when COMPLETED and completion gate passes', async () => {
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'e1',
          status: 'COMPLETED',
        }),
      },
    };
    const completion = {
      evaluate: jest.fn().mockResolvedValue({ ready: true, reasons: [], checks: {} }),
    };
    const svc = new PoeWorkflowService(prisma as never, completion as never);
    const gate = await svc.enrollmentReadyForCertificate('e1');
    expect(gate.ready).toBe(true);
    expect(gate.reasons).toEqual([]);
  });
});
