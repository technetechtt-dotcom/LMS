import { ForbiddenException } from '@nestjs/common';
import { RemedialService } from './remedial.service';

describe('RemedialService acknowledgement boundaries', () => {
  const staff = {
    userId: 'fac-1',
    email: 'fac@org.za',
    organisationId: 'org-a',
    roleCodes: ['FACILITATOR'],
  };
  const learner = {
    userId: 'learner-1',
    email: 'learner@org.za',
    organisationId: 'org-a',
    roleCodes: ['LEARNER'],
  };

  it('blocks staff from acknowledging without an audited override', async () => {
    const service = new RemedialService({
      remedialAssignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'rem-1',
          acknowledgedAt: null,
        }),
      },
    } as never);

    await expect(service.acknowledge('rem-1', staff)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('records a staff override with reason and audit row', async () => {
    const update = jest.fn().mockResolvedValue({
      id: 'rem-1',
      acknowledgedAt: new Date(),
      completedAt: new Date(),
    });
    const auditCreate = jest.fn().mockResolvedValue({});
    const service = new RemedialService({
      remedialAssignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'rem-1',
          acknowledgedAt: null,
          completedAt: null,
        }),
        update,
      },
      auditLog: { create: auditCreate },
    } as never);

    await service.staffOverride(
      'rem-1',
      { action: 'complete', reason: 'Learner unreachable after workplace injury' },
      staff,
    );
    expect(update).toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'STAFF_OVERRIDE_COMPLETE',
          entityId: 'rem-1',
        }),
      }),
    );
  });

  it('allows the assigned learner to acknowledge', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'rem-1', acknowledgedAt: new Date() });
    const service = new RemedialService({
      remedialAssignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'rem-1',
          acknowledgedAt: null,
        }),
        update,
      },
    } as never);
    await service.acknowledge('rem-1', learner);
    expect(update).toHaveBeenCalled();
  });
});
