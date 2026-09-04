import { ComplianceService } from './compliance.service';

describe('ComplianceService NLRD validation', () => {
  it('stores but does not submit an invalid export', async () => {
    const gatewayCreate = jest.fn();
    const prisma = {
      enrollment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'enrollment-1',
            status: 'ENROLLED',
            metadata: {},
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            startedAt: null,
            learner: {
              firstName: 'Test',
              lastName: 'Learner',
              email: 'learner@example.com',
            },
            programme: {
              code: 'PROGRAMME-1',
              qualification: { saqaId: '123', nqfLevel: 4 },
            },
          },
        ]),
      },
      document: { create: jest.fn().mockResolvedValue({}) },
      setaGatewaySubmission: { create: gatewayCreate },
    };
    const files = {
      upload: jest.fn().mockResolvedValue({
        key: 'exports/nlrd/export.xml',
        bucket: 'test-bucket',
      }),
      storageLocator: jest.fn().mockReturnValue('storage://export.xml'),
    };
    const config = {
      get: jest.fn().mockReturnValue('https://regulator.example/submit'),
    };
    const service = new ComplianceService(
      prisma as never,
      files as never,
      config as never,
    );

    const result = await service.generateNlrd({
      userId: 'admin-1',
      email: 'admin@example.com',
      organisationId: 'organisation-1',
      roleCodes: ['ADMIN'],
    });

    expect(result.valid).toBe(false);
    expect(result.gateway.status).toBe('validation_failed');
    expect(gatewayCreate).not.toHaveBeenCalled();
  });
});
