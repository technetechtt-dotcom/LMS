import { CertificatesService } from '../certificates/certificates.service';
import { PoeWorkflowService } from '../poe/poe-workflow.service';

/**
 * Domain E2E: learner completion gate → credential issue (mocked persistence).
 */
describe('learner → credential E2E', () => {
  it('refuses issue when programme completion gate fails', async () => {
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
    const poe = new PoeWorkflowService(prisma as never, completion as never);
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
    const transactionClient = {
      document: {
        create: jest.fn().mockResolvedValue({ id: 'doc1' }),
      },
      credential: {
        findFirst: jest.fn().mockResolvedValue(null),
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
    const prisma = {
      ...transactionClient,
      enrollment: {
        findFirst: jest.fn().mockResolvedValue(enrollment),
      },
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn(transactionClient as never)),
    };
    const poe = {
      enrollmentReadyForCertificate: jest.fn().mockResolvedValue({
        ready: true,
        reasons: [],
      }),
    };
    const files = {
      upload: jest
        .fn()
        .mockResolvedValue({
          key: 'k',
          bucket: 'b',
          url: 'storage://b/k',
          uploadId: 'upload-1',
          sha256: 'checksum',
        }),
      assertUploadAvailable: jest.fn().mockResolvedValue(undefined),
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
      { enrollmentId: 'e1' },
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
    expect(created[0].metadata).toEqual(expect.objectContaining({
      signature: expect.any(String),
      signatureAlgorithm: 'HMAC-SHA256',
    }));

    const persisted = {
      ...created[0],
      id: 'cred1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    transactionClient.credential.findFirst.mockResolvedValue(persisted);
    await expect(svc.verify(String(created[0].verificationCode))).resolves.toEqual(
      expect.objectContaining({ valid: true, signatureValid: true }),
    );
    transactionClient.credential.findFirst.mockResolvedValue({
      ...persisted,
      learnerName: 'Tampered Name',
    });
    await expect(svc.verify(String(created[0].verificationCode))).resolves.toEqual(
      expect.objectContaining({ valid: false, signatureValid: false }),
    );
  });
});
