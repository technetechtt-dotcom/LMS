import { PoeWorkflowService } from '../poe/poe-workflow.service';
import { CertificatesService } from '../certificates/certificates.service';

/**
 * Domain E2E: learner completion gate → credential issue (mocked persistence).
 */
describe('learner → credential E2E', () => {
  it('refuses issue when summative is missing even if workbook is approved', async () => {
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
          .mockResolvedValueOnce(null),
      },
    };
    const poe = new PoeWorkflowService(prisma as never);
    const gate = await poe.enrollmentReadyForCertificate('e1');
    expect(gate.ready).toBe(false);
  });

  it('issues a Credential row from server-side learner/programme names', async () => {
    const enrollment = {
      id: 'e1',
      learner: { firstName: 'Ada', lastName: 'Lovelace' },
      programme: { title: 'IT Systems NQF5' },
    };
    const created: Record<string, unknown>[] = [];
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue(enrollment),
      },
      document: {
        create: jest.fn().mockResolvedValue({ id: 'doc1' }),
      },
      credential: {
        create: jest.fn().mockImplementation(({ data }) => {
          created.push(data);
          return Promise.resolve({
            ...data,
            id: 'cred1',
            createdAt: new Date(),
            updatedAt: new Date(),
            issuedAt: data.issuedAt,
          });
        }),
      },
    };
    const poe = {
      enrollmentReadyForCertificate: jest.fn().mockResolvedValue({
        ready: true,
        reasons: [],
      }),
    };
    const files = {
      upload: jest.fn().mockResolvedValue({ key: 'k', bucket: 'b', url: 'storage://b/k' }),
      storageLocator: jest.fn().mockReturnValue('storage://b/k'),
    };
    const config = { get: jest.fn().mockReturnValue('http://localhost:5173') };
    const svc = new CertificatesService(
      prisma as never,
      files as never,
      poe as never,
      config as never,
    );
    const result = await svc.issue(
      {
        enrollmentId: 'e1',
        learnerName: 'HACKER',
        programmeName: 'FAKE',
        title: 'FAKE TITLE',
      } as never,
      {
        userId: 'admin',
        email: 'a@x',
        organisationId: 'org1',
        roleCodes: ['ADMIN'],
      },
    );
    expect(result.learnerName).toBe('Ada Lovelace');
    expect(result.programmeName).toBe('IT Systems NQF5');
    expect(created[0].learnerName).toBe('Ada Lovelace');
  });
});
