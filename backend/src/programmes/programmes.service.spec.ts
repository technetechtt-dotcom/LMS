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
        create: jest.fn(),
        update: jest.fn(),
      },
      programmeModule: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      facilitatorAssignment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
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

  it('creates programme with valid qualification', async () => {
    prisma.qualification.findFirst.mockResolvedValue({ id: 'q1', title: 'IT Systems' });
    prisma.programme.create.mockResolvedValue({
      id: 'p1',
      organisationId: 'org-1',
      qualificationId: 'q1',
      code: 'PROG-1',
      title: 'Prog 1',
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
      },
      mockAdminUser,
    );
    expect(res).toMatchObject({
      id: 'p1',
      code: 'PROG-1',
      status: 'draft',
    });
  });

  it('fails to activate programme without KM, PM, and WM modules', async () => {
    prisma.programme.findFirst.mockResolvedValue({
      id: 'p1',
      organisationId: 'org-1',
      modules: [
        { id: 'm1', moduleType: 'KNOWLEDGE' },
      ],
    });

    await expect(
      service.updateStatus('p1', { status: 'active' }, mockAdminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('activates programme when all KM, PM, and WM modules exist', async () => {
    prisma.programme.findFirst.mockResolvedValue({
      id: 'p1',
      organisationId: 'org-1',
      modules: [
        { id: 'm1', moduleType: 'KNOWLEDGE' },
        { id: 'm2', moduleType: 'PRACTICAL' },
        { id: 'm3', moduleType: 'WORKPLACE' },
      ],
    });
    prisma.programme.update.mockResolvedValue({ id: 'p1', status: 'active' });

    const res = await service.updateStatus('p1', { status: 'active' }, mockAdminUser);
    expect(res).toMatchObject({ id: 'p1', status: 'active' });
  });

  it('assigns facilitator to programme', async () => {
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
  });
});
