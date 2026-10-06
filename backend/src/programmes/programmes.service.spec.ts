import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProgrammesService } from './programmes.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';

describe('ProgrammesService', () => {
  let service: ProgrammesService;
  let prisma: any;

  const mockAdminUser: AuthUser = {
    userId: 'admin-1',
    email: 'admin@skillforge.co.za',
    organisationId: 'org-1',
    roleCodes: ['ADMIN'],
  };

  beforeEach(() => {
    prisma = {
      qualification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      programme: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      programmeModule: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      facilitatorAssignment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      userOrganisation: {
        findFirst: jest.fn(),
      },
      cohort: {
        findFirst: jest.fn(),
      },
      enrollment: {
        findFirst: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((arg) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg))),
    };
    service = new ProgrammesService(prisma as unknown as PrismaService);
  });

  it('lists qualifications with unit standards', async () => {
    prisma.qualification.findMany.mockResolvedValue([
      { id: 'q1', title: 'Systems Dev', unitStandards: [] },
    ]);
    const result = await service.listQualifications();
    expect(result).toHaveLength(1);
    expect(prisma.qualification.findMany).toHaveBeenCalled();
  });

  it('creates programme with valid qualification and persists description', async () => {
    prisma.programme.findFirst.mockResolvedValue(null);
    prisma.qualification.findFirst.mockResolvedValue({ id: 'q1', title: 'IT Systems' });
    prisma.programme.create.mockResolvedValue({ id: 'p1' });
    prisma.programme.findUnique.mockResolvedValue({
      id: 'p1',
      organisationId: 'org-1',
      qualificationId: 'q1',
      code: 'PROG-1',
      title: 'Prog 1',
      description: 'Custom programme description',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      qualification: { nqfLevel: 5, totalCredits: 120, title: 'IT Systems' },
      organisation: { name: 'SkillForge' },
      modules: [],
    });

    const res = await service.create(
      {
        qualificationId: 'q1',
        code: 'PROG-1',
        title: 'Prog 1',
        description: 'Custom programme description',
      },
      mockAdminUser,
    );
    expect(res).toMatchObject({
      id: 'p1',
      code: 'PROG-1',
      status: 'draft',
      description: 'Custom programme description',
    });
  });

  it('rejects duplicate programme codes within the same organisation', async () => {
    prisma.programme.findFirst.mockResolvedValue({ id: 'existing', code: 'PROG-1' });

    await expect(
      service.create(
        {
          qualificationId: 'q1',
          code: 'PROG-1',
          title: 'Prog 1',
        },
        mockAdminUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails to activate programme without KM, PM, and WM modules', async () => {
    prisma.programme.findFirst.mockResolvedValue({
      id: 'p1',
      organisationId: 'org-1',
      status: 'draft',
      modules: [
        { id: 'm1', moduleType: 'KNOWLEDGE' },
      ],
    });

    await expect(
      service.updateStatus('p1', { status: 'active' as any }, mockAdminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents invalid lifecycle transitions from archived to draft', async () => {
    prisma.programme.findFirst.mockResolvedValue({
      id: 'p1',
      organisationId: 'org-1',
      status: 'archived',
      modules: [],
    });

    await expect(
      service.updateStatus('p1', { status: 'draft' as any }, mockAdminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('activates programme when all KM, PM, and WM modules exist', async () => {
    prisma.programme.findFirst.mockResolvedValue({
      id: 'p1',
      organisationId: 'org-1',
      status: 'draft',
      modules: [
        { id: 'm1', moduleType: 'KNOWLEDGE' },
        { id: 'm2', moduleType: 'PRACTICAL' },
        { id: 'm3', moduleType: 'WORKPLACE' },
      ],
    });
    prisma.programme.update.mockResolvedValue({ id: 'p1', status: 'active' });

    const res = await service.updateStatus('p1', { status: 'active' as any }, mockAdminUser);
    expect(res).toMatchObject({ id: 'p1', status: 'active' });
  });

  it('assigns facilitator to programme with audit log', async () => {
    prisma.programme.findFirst.mockResolvedValue({ id: 'p1', organisationId: 'org-1' });
    prisma.userOrganisation.findFirst.mockResolvedValue({
      id: 'uo-1',
      user: { id: 'f1' },
    });
    prisma.facilitatorAssignment.findFirst.mockResolvedValue(null);
    prisma.facilitatorAssignment.create.mockResolvedValue({
      id: 'fa-1',
      facilitatorId: 'f1',
      programmeId: 'p1',
      isActive: true,
    });

    const res = await service.assignFacilitator(
      {
        facilitatorId: 'f1',
        programmeId: 'p1',
      },
      mockAdminUser,
    );
    expect(res).toMatchObject({ id: 'fa-1', facilitatorId: 'f1' });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'FACILITATOR_ASSIGNMENT_CREATED' }),
      }),
    );
  });

  it('rejects duplicate active facilitator assignments', async () => {
    prisma.programme.findFirst.mockResolvedValue({ id: 'p1', organisationId: 'org-1' });
    prisma.userOrganisation.findFirst.mockResolvedValue({
      id: 'uo-1',
      user: { id: 'f1' },
    });
    prisma.facilitatorAssignment.findFirst.mockResolvedValue({ id: 'existing-fa' });

    await expect(
      service.assignFacilitator(
        {
          facilitatorId: 'f1',
          programmeId: 'p1',
        },
        mockAdminUser,
      ),
    ).rejects.toThrow('An active facilitator assignment with the exact same scope already exists');
  });

  it('reorders modules securely in a single transaction', async () => {
    prisma.programme.findFirst.mockResolvedValue({ id: 'p1', organisationId: 'org-1' });
    prisma.programmeModule.findMany.mockResolvedValue([
      { id: 'm1' },
      { id: 'm2' },
    ]);
    prisma.programmeModule.update.mockResolvedValue({ id: 'm2', order: 1 });

    const res = await service.reorderModules(
      'p1',
      { moduleIds: ['m2', 'm1'] },
      mockAdminUser,
    );
    expect(res).toEqual({ ok: true, count: 2 });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects module reordering with duplicate module IDs', async () => {
    prisma.programme.findFirst.mockResolvedValue({ id: 'p1', organisationId: 'org-1' });

    await expect(
      service.reorderModules(
        'p1',
        { moduleIds: ['m1', 'm1'] },
        mockAdminUser,
      ),
    ).rejects.toThrow('Duplicate module IDs');
  });

  it('rejects module reordering with foreign or cross-programme module IDs', async () => {
    prisma.programme.findFirst.mockResolvedValue({ id: 'p1', organisationId: 'org-1' });
    prisma.programmeModule.findMany.mockResolvedValue([
      { id: 'm1' },
      { id: 'm2' },
    ]);

    await expect(
      service.reorderModules(
        'p1',
        { moduleIds: ['m1', 'foreign-m3'] },
        mockAdminUser,
      ),
    ).rejects.toThrow('does not belong to this programme and organisation');
  });
});
