import { CertificatesService } from './certificates.service';

describe('CertificatesService authoritative credential lifecycle', () => {
  const user = {
    userId: 'admin-1',
    email: 'admin@example.test',
    organisationId: 'organisation-1',
    roleCodes: ['ADMIN'],
  };
  const issuedAt = new Date('2026-01-02T00:00:00Z');
  const row = {
    id: 'credential-1',
    organisationId: 'organisation-1',
    enrollmentId: 'enrollment-1',
    title: 'Certificate of Competence — Systems',
    learnerName: 'Ada Lovelace',
    programmeName: 'Systems',
    certificateNumber: 'CERT-ONE',
    verificationCode: 'verify-code',
    status: 'ISSUED',
    issuedAt,
    pdfStorageKey: 'certificates/organisation-1/cert.pdf',
    pdfSha256: 'a'.repeat(64),
    metadata: {},
    createdAt: issuedAt,
    updatedAt: issuedAt,
  };

  function setup() {
    const tx = {
      credential: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(row),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...row, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...row, ...data })),
      },
      document: { create: jest.fn().mockResolvedValue({ id: 'document-1' }) },
    };
    const prisma = {
      credential: {
        findMany: jest.fn().mockResolvedValue([row]),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...row, ...data })),
      },
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'enrollment-1',
          learnerId: 'learner-1',
          learner: { firstName: 'Ada', lastName: 'Lovelace' },
          programme: { title: 'Systems' },
        }),
      },
      $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const files = {
      upload: jest.fn().mockResolvedValue({
        uploadId: 'upload-1',
        key: 'certificates/organisation-1/cert.pdf',
        bucket: 'private',
      }),
      assertUploadAvailable: jest.fn().mockResolvedValue(undefined),
      storageLocator: jest.fn().mockReturnValue('storage://private/certificates/org/cert.pdf'),
      getSignedDownloadUrl: jest.fn().mockResolvedValue('https://signed.example.test/file'),
    };
    const poe = {
      enrollmentReadyForCertificate: jest.fn().mockResolvedValue({ ready: true, reasons: [] }),
    };
    const config = {
      get: jest.fn((key: string) => key === 'FILE_SIGNING_SECRET'
        ? 'credential-signing-secret-at-least-32-characters'
        : key === 'FRONTEND_ORIGIN'
          ? 'https://lms.example.test,https://secondary.example.test'
          : undefined),
    };
    const notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    const service = new CertificatesService(
      prisma as never,
      files as never,
      poe as never,
      config as never,
      notifications as never,
    );
    (service as unknown as { buildPdf: jest.Mock }).buildPdf =
      jest.fn().mockResolvedValue(Buffer.from('credential-pdf'));
    return { service, prisma, tx, files, poe, notifications };
  }

  it('lists only actor-scoped credentials and maps persisted values', async () => {
    const { service, prisma } = setup();
    await expect(service.list(user, 'enrollment-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'credential-1',
        learnerId: 'enrollment-1',
        status: 'issued',
        issuedAt: issuedAt.toISOString(),
      }),
    ]);
    expect(prisma.credential.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organisationId: 'organisation-1', enrollmentId: 'enrollment-1',
      }),
    }));
  });

  it('rejects a failed completion gate, missing tenant enrollment and an active duplicate', async () => {
    const failed = setup();
    failed.poe.enrollmentReadyForCertificate.mockResolvedValue({
      ready: false, reasons: ['moderation incomplete'],
    });
    await expect(failed.service.issue({ enrollmentId: 'enrollment-1' }, user))
      .rejects.toMatchObject({ response: expect.objectContaining({ reasons: ['moderation incomplete'] }) });

    const missing = setup();
    missing.prisma.enrollment.findFirst.mockResolvedValue(null);
    await expect(missing.service.issue({ enrollmentId: 'enrollment-1' }, user))
      .rejects.toThrow('Enrollment not found');

    const duplicate = setup();
    duplicate.prisma.credential.findFirst.mockResolvedValue({ id: 'already-issued' });
    await expect(duplicate.service.issue({ enrollmentId: 'enrollment-1' }, user))
      .rejects.toThrow('active credential already exists');
    expect(duplicate.files.upload).not.toHaveBeenCalled();
  });

  it('rechecks duplicates inside the issuance transaction', async () => {
    const { service, tx, files } = setup();
    tx.credential.findFirst.mockResolvedValue({ id: 'racing-credential' });
    await expect(service.issue({ enrollmentId: 'enrollment-1' }, user))
      .rejects.toThrow('active credential already exists');
    expect(files.assertUploadAvailable).toHaveBeenCalled();
    expect(tx.document.create).not.toHaveBeenCalled();
  });

  it('issues and reissues inside a transaction while preserving supersession metadata', async () => {
    const { service, tx, notifications } = setup();
    const result = await service.issue(
      { enrollmentId: 'enrollment-1' },
      user,
      'prior-credential',
    );
    expect(result).toEqual(expect.objectContaining({ status: 'issued' }));
    expect(tx.credential.update).toHaveBeenCalledWith({
      where: { id: 'prior-credential' },
      data: { status: 'SUPERSEDED' },
    });
    expect(tx.document.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ uploadId: 'upload-1' }),
    }));
    expect(tx.credential.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        supersedesId: 'prior-credential',
        pdfSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        metadata: expect.objectContaining({
          signature: expect.any(String), signatureAlgorithm: 'HMAC-SHA256',
        }),
      }),
    }));
    expect(notifications.notify).toHaveBeenCalledWith(
      'learner-1', 'credential', expect.any(String), expect.any(String), expect.any(Object),
    );
  });

  it('requires a revocation reason and permits exactly one revocation', async () => {
    const { service, prisma } = setup();
    await expect(service.revoke('credential-1', { reason: ' ' }, user))
      .rejects.toThrow('reason is required');
    await expect(service.revoke('missing', { reason: 'error' }, user))
      .rejects.toThrow('Credential not found');

    prisma.credential.findFirst.mockResolvedValueOnce(row);
    await expect(service.revoke('credential-1', { reason: 'Issued in error' }, user))
      .resolves.toEqual(expect.objectContaining({ status: 'revoked' }));
    expect(prisma.credential.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'REVOKED', revocationReason: 'Issued in error',
        metadata: { revokedBy: 'admin-1' },
      }),
    }));

    prisma.credential.findFirst.mockResolvedValueOnce({ ...row, status: 'REVOKED' });
    await expect(service.revoke('credential-1', { reason: 'again' }, user))
      .rejects.toThrow('already revoked');
  });

  it('reissues only an existing non-revoked credential', async () => {
    const missing = setup();
    await expect(missing.service.reissue('missing', user)).rejects.toThrow('Credential not found');

    const revoked = setup();
    revoked.prisma.credential.findFirst.mockResolvedValue({ ...row, status: 'REVOKED' });
    await expect(revoked.service.reissue('credential-1', user))
      .rejects.toThrow('Cannot reissue a revoked credential');

    const valid = setup();
    valid.prisma.credential.findFirst.mockResolvedValue(row);
    const issue = jest.spyOn(valid.service, 'issue').mockResolvedValue({ id: 'replacement' } as never);
    await expect(valid.service.reissue('credential-1', user)).resolves.toEqual({
      priorId: 'credential-1', replacement: { id: 'replacement' },
    });
    expect(issue).toHaveBeenCalledWith({ enrollmentId: 'enrollment-1' }, user, 'credential-1');
  });

  it('returns only actor-scoped signed download URLs', async () => {
    const { service, prisma, files } = setup();
    await expect(service.download('missing', user)).rejects.toThrow('Credential not found');
    prisma.credential.findFirst.mockResolvedValueOnce(row);
    await expect(service.download('credential-1', user)).resolves.toEqual({
      id: 'credential-1',
      storageKey: row.pdfStorageKey,
      downloadUrl: 'https://signed.example.test/file',
      expiresInSeconds: 900,
    });
    expect(files.getSignedDownloadUrl).toHaveBeenCalledWith(row.pdfStorageKey, 900);
  });

  it('fails verification for missing, unsigned, revoked and tampered credentials', async () => {
    const { service, prisma } = setup();
    await expect(service.verify('missing')).rejects.toThrow('Certificate not found');

    prisma.credential.findFirst.mockResolvedValueOnce(row);
    await expect(service.verify('unsigned')).resolves.toEqual(expect.objectContaining({
      valid: false, signatureValid: false, learnerInitials: 'AL',
    }));

    const sign = (service as unknown as {
      credentialSignature(input: Record<string, unknown>): string;
    }).credentialSignature.bind(service);
    const signature = sign({
      certificateNumber: row.certificateNumber,
      enrollmentId: row.enrollmentId,
      learnerName: row.learnerName,
      programmeName: row.programmeName,
      issuedAt: row.issuedAt,
      pdfSha256: row.pdfSha256,
    });
    prisma.credential.findFirst.mockResolvedValueOnce({
      ...row, status: 'REVOKED', metadata: { signature, signatureAlgorithm: 'HMAC-SHA256' },
    });
    await expect(service.verify('revoked')).resolves.toEqual(expect.objectContaining({
      valid: false, signatureValid: true, credentialStatus: 'REVOKED',
    }));
    prisma.credential.findFirst.mockResolvedValueOnce({
      ...row, learnerName: 'Tampered', metadata: { signature },
    });
    await expect(service.verify('tampered')).resolves.toEqual(expect.objectContaining({
      valid: false, signatureValid: false,
    }));
  });
});
