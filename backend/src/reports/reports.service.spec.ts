import { ReportsService } from './reports.service';

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
});
