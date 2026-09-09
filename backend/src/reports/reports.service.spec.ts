import { ReportsService } from './reports.service';
import { createHash } from 'crypto';

describe('ReportsService tenant filters and persistence', () => {
  const user = {
    userId: 'admin-1',
    email: 'admin@example.com',
    organisationId: 'organisation-1',
    roleCodes: ['ADMIN'],
  };

  it('applies programme and as-of filters to enrollments, documents and assessments', async () => {
    const enrollmentCount = jest.fn().mockResolvedValue(4);
    const documentCount = jest.fn().mockResolvedValue(3);
    const assessmentCount = jest.fn().mockResolvedValue(2);
    const service = new ReportsService({
      enrollment: { count: enrollmentCount },
      document: { count: documentCount },
      assessment: { count: assessmentCount },
    } as never);

    const snapshot = await service.setaSnapshot(user, {
      programmeId: 'programme-1',
      asOf: '2026-06-30',
    });
    expect(snapshot).toEqual(expect.objectContaining({ enrollments: 4, docs: 3, assessments: 2 }));
    expect(enrollmentCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        programmeId: 'programme-1',
        createdAt: { lte: new Date('2026-06-30T23:59:59.999Z') },
      }),
    });
    expect(documentCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organisationId: 'organisation-1',
        enrollment: expect.objectContaining({ programmeId: 'programme-1' }),
      }),
    });
    expect(assessmentCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        enrollment: expect.objectContaining({ programmeId: 'programme-1' }),
      }),
    });
  });

  it('rejects an invalid reporting date', async () => {
    const service = new ReportsService({
      enrollment: { count: jest.fn() },
      document: { count: jest.fn() },
      assessment: { count: jest.fn() },
    } as never);
    await expect(service.setaSnapshot(user, { asOf: 'not-a-date' })).rejects.toThrow(
      'asOf must be a valid date',
    );
  });

  it('soft-deletes only a generated report in the active tenant', async () => {
    const update = jest.fn().mockResolvedValue({});
    const service = new ReportsService({
      generatedReport: {
        findFirst: jest.fn().mockResolvedValue({ id: 'report-1' }),
        update,
      },
    } as never);
    await expect(service.deleteGenerated('report-1', user)).resolves.toEqual({
      id: 'report-1',
      deleted: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('does not reveal a foreign generated report', async () => {
    const service = new ReportsService({
      generatedReport: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never);
    await expect(service.deleteGenerated('foreign-report', user)).rejects.toThrow(
      'Generated report not found',
    );
  });

  it('creates a generated report with the requested filters and a stable display name', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'report-1' });
    const service = new ReportsService({
      enrollment: { count: jest.fn().mockResolvedValue(1) },
      document: { count: jest.fn().mockResolvedValue(2) },
      assessment: { count: jest.fn().mockResolvedValue(3) },
      generatedReport: { create },
    } as never);
    const filters = { qualificationId: 'qualification-1', employerOrganisationId: 'employer-1' };

    await service.createGenerated({ reportType: 'learner_progress', format: 'pdf', filters }, user);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisationId: user.organisationId,
        generatedById: user.userId,
        reportType: 'learner_progress',
        format: 'pdf',
        name: 'learner progress report',
        filters,
        snapshot: expect.objectContaining({ enrollments: 1, docs: 2, assessments: 3 }),
      }),
      include: { generatedBy: { select: { firstName: true, lastName: true } } },
    });
  });

  it('returns exact CSV content and records a checksum-bound download audit event', async () => {
    const snapshot = {
      enrollments: 12,
      docs: 8,
      assessments: 5,
      generatedAt: '2026-06-30T12:00:00.000Z',
    };
    const filters = { programmeId: 'programme-1', asOf: '2026-06-30' };
    const create = jest.fn().mockResolvedValue({ id: 'download-1' });
    const service = new ReportsService({
      generatedReport: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'report-1',
          reportType: 'seta-snapshot',
          format: 'csv',
          filters,
          snapshot,
        }),
      },
      reportDownload: { create },
    } as never);

    const file = await service.generatedFile('report-1', user);
    const expected = [
      'Internal draft - Not submitted to SETA',
      'metric,value',
      'enrollments,12',
      'documents,8',
      'assessments,5',
      'generatedAt,2026-06-30T12:00:00.000Z',
    ].join('\n');

    expect(file).toEqual({
      bytes: Buffer.from(expected),
      type: 'text/csv; charset=utf-8',
      filename: 'report-report-1.csv',
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        reportId: 'report-1',
        organisationId: user.organisationId,
        requestedById: user.userId,
        requesterRole: 'ADMIN',
        reportType: 'seta-snapshot',
        format: 'csv',
        filters,
        fileSha256: createHash('sha256').update(expected).digest('hex'),
      },
    });
  });

  it('renders a PDF download and audits the exact returned bytes', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'download-2' });
    const service = new ReportsService({
      generatedReport: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'report-2',
          reportType: 'seta-snapshot',
          format: 'pdf',
          filters: {},
          snapshot: {
            enrollments: 2,
            docs: 1,
            assessments: 1,
            generatedAt: '2026-06-30T12:00:00.000Z',
          },
        }),
      },
      reportDownload: { create },
    } as never);

    const file = await service.generatedFile('report-2', user);

    expect(file.type).toBe('application/pdf');
    expect(file.filename).toBe('report-report-2.pdf');
    expect(file.bytes.subarray(0, 4).toString('ascii')).toBe('%PDF');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reportId: 'report-2',
        format: 'pdf',
        fileSha256: createHash('sha256').update(file.bytes).digest('hex'),
      }),
    });
  });

  it('limits a SETA official to reports they generated', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new ReportsService({ generatedReport: { findMany } } as never);
    const seta = { ...user, userId: 'seta-1', roleCodes: ['SETA'] };

    await service.listGenerated(seta);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        organisationId: user.organisationId,
        deletedAt: null,
        generatedById: 'seta-1',
      },
    }));
  });
});
