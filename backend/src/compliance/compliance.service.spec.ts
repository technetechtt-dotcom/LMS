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

describe('ComplianceService persisted decisions and internal exports', () => {
  const admin = {
    userId: 'admin-1',
    email: 'admin@example.com',
    organisationId: 'organisation-1',
    roleCodes: ['ADMIN'],
  };

  it('persists a tenant-scoped human control decision', async () => {
    const upsert = jest.fn().mockResolvedValue({
      controlKey: 'health-safety',
      status: 'SATISFIED',
    });
    const service = new ComplianceService(
      {
        complianceDecision: { upsert },
        document: { count: jest.fn().mockResolvedValue(1) },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.recordDecision(
        'HEALTH-SAFETY',
        { status: 'satisfied', evidenceDocumentIds: ['document-1'] },
        admin,
      ),
    ).resolves.toEqual(expect.objectContaining({ status: 'SATISFIED' }));
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organisationId_controlKey: {
            organisationId: 'organisation-1',
            controlKey: 'health-safety',
          },
        },
        create: expect.objectContaining({ decidedById: 'admin-1' }),
      }),
    );
  });

  it('rejects invented controls and statuses', async () => {
    const service = new ComplianceService(
      { complianceDecision: { upsert: jest.fn() } } as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.recordDecision('audit-ready', { status: 'SATISFIED' }, admin),
    ).rejects.toThrow('Unknown compliance control');
    await expect(
      service.recordDecision('health-safety', { status: 'CERTIFIED' }, admin),
    ).rejects.toThrow('Invalid compliance decision status');
  });

  it('stores a real export but blocks gateway submission for an uncertified adapter', async () => {
    const gatewayCreate = jest.fn().mockResolvedValue({ id: 'gateway-1' });
    const upload = jest.fn().mockResolvedValue({
      key: 'exports/seta/organisation-1/export.xml',
      bucket: 'private-bucket',
    });
    const service = new ComplianceService(
      {
        enrollment: {
          groupBy: jest.fn().mockResolvedValue([
            { status: 'ENROLLED', _count: { _all: 2 } },
          ]),
        },
        document: {
          count: jest.fn().mockResolvedValue(3),
          create: jest.fn().mockResolvedValue({}),
        },
        setaGatewaySubmission: { create: gatewayCreate },
      } as never,
      {
        upload,
        storageLocator: jest.fn().mockReturnValue('storage://private/export.xml'),
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://signed.example/export'),
      } as never,
      { get: jest.fn().mockReturnValue('https://regulator.example/submit') } as never,
    );

    const result = await service.exportSeta(admin, 'mict-seta', 'xml');
    expect(result.url).toBe('https://signed.example/export');
    expect(result.gateway).toEqual(
      expect.objectContaining({
        status: 'generated_not_submitted',
        message: expect.stringContaining('not certified'),
      }),
    );
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/\.xml$/),
      expect.any(Buffer),
      'application/xml',
      expect.objectContaining({ organisationId: 'organisation-1' }),
    );
    expect(gatewayCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'generated_not_submitted' }),
      }),
    );
  });
});
