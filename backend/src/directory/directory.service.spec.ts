import { DirectoryService } from './directory.service';

describe('DirectoryService tenant-safe discovery', () => {
  const actor = (userId: string, roleCodes: string[]) => ({
    userId,
    email: `${userId}@example.test`,
    organisationId: 'organisation-1',
    roleCodes,
  });

  function setup() {
    const prisma = {
      user: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{
          id: 'person-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          isActive: true,
          passwordSetAt: new Date(),
          memberships: [{ role: { code: 'ASSESSOR' } }],
          email: 'must-not-be-returned@example.test',
        }]),
      },
      enrollment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { service: new DirectoryService(prisma as never), prisma };
  }

  it('prevents learners from enumerating staff', () => {
    const { service } = setup();
    expect(() => service.staff(actor('learner-1', ['LEARNER']), { page: 1, pageSize: 20 }))
      .toThrow('cannot enumerate');
  });

  it('limits requested roles, tenant, fields, search and pagination', async () => {
    const { service, prisma } = setup();
    const result = await service.staff(
      actor('facilitator-1', ['FACILITATOR']),
      { roles: 'ASSESSOR,ADMIN', search: ' Ada ', page: 2, pageSize: 10 },
    );
    expect(result).toEqual({
      items: [{ id: 'person-1', name: 'Ada Lovelace', role: 'ASSESSOR', status: 'ACTIVE' }],
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0]).not.toHaveProperty('email');
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        memberships: { some: expect.objectContaining({
          organisationId: 'organisation-1', role: { code: { in: ['ASSESSOR'] } },
        }) },
        OR: expect.any(Array),
      }),
      skip: 10,
      take: 10,
      select: expect.not.objectContaining({ email: expect.anything() }),
    }));
  });

  it('returns truthful inactive and pending-activation statuses', async () => {
    const { service, prisma } = setup();
    prisma.user.count.mockResolvedValue(2);
    prisma.user.findMany.mockResolvedValue([
      { id: 'inactive', firstName: 'In', lastName: 'Active', isActive: false, passwordSetAt: new Date(), memberships: [] },
      { id: 'pending', firstName: 'Pending', lastName: 'User', isActive: true, passwordSetAt: null, memberships: [] },
    ]);
    const result = await service.staff(actor('admin-1', ['ADMIN']), { page: 1, pageSize: 20 });
    expect(result.items.map((item) => item.status)).toEqual(['INACTIVE', 'PENDING_ACTIVATION']);
    expect(result.items.map((item) => item.role)).toEqual(['UNKNOWN', 'UNKNOWN']);
  });

  it('lets learners message only staff allocated through their enrollments', async () => {
    const { service, prisma } = setup();
    prisma.enrollment.findMany.mockResolvedValue([{
      metadata: { facilitatorId: 'facilitator-1', workplaceMentorId: 'mentor-1' },
      assessments: [{ assessorId: 'assessor-1', moderatorId: 'moderator-1' }],
    }]);
    await service.messageRecipients(actor('learner-1', ['LEARNER']), { page: 1, pageSize: 20 });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { in: expect.arrayContaining([
          'facilitator-1', 'mentor-1', 'assessor-1', 'moderator-1',
        ]) },
        memberships: { some: { organisationId: 'organisation-1', deletedAt: null } },
      }),
    }));
  });

  it('lets mentors message only allocated learners and view only themselves as mentors', async () => {
    const { service, prisma } = setup();
    prisma.enrollment.findMany.mockResolvedValueOnce([
      { learnerId: 'learner-1' }, { learnerId: 'learner-2' },
    ]);
    await service.messageRecipients(actor('mentor-1', ['MENTOR']), { page: 1, pageSize: 20 });
    expect(prisma.user.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ['learner-1', 'learner-2'] } }),
    }));

    await service.mentors(actor('mentor-1', ['MENTOR']), { page: 1, pageSize: 20 });
    expect(prisma.user.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'mentor-1' }),
    }));
  });

  it('returns only the learner’s allocated mentor records', async () => {
    const { service, prisma } = setup();
    prisma.enrollment.findMany.mockResolvedValue([{ metadata: { workplaceMentorId: 'mentor-1' } }]);
    await service.mentors(actor('learner-1', ['LEARNER']), { page: 1, pageSize: 20 });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ['mentor-1'] } }),
    }));
  });
});
