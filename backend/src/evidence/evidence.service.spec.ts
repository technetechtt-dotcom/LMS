import { BadRequestException } from '@nestjs/common';
import { EvidenceService } from './evidence.service';

describe('EvidenceService verified upload enforcement', () => {
  const user = {
    userId: 'user-1',
    email: 'learner@example.test',
    organisationId: 'organisation-1',
    roleCodes: ['LEARNER'],
  };
  const dto = {
    enrollmentId: 'enrollment-1',
    unitStandardId: 'unit-1',
  };

  function setup() {
    const prisma = {
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'enrollment-1',
          learnerId: 'user-1',
          metadata: {},
        }),
      },
      evidence: { create: jest.fn().mockImplementation(({ data }) => data) },
    };
    const files = {
      uploadStaged: jest.fn().mockResolvedValue({
        uploadId: 'upload-1',
        key: 'evidence/organisation-1/generated.pdf',
        url: 'storage://private/evidence/organisation-1/generated.pdf',
        mimeType: 'application/pdf',
        size: 321,
        sha256: 'a'.repeat(64),
        status: 'VERIFIED',
      }),
    };
    return {
      service: new EvidenceService(prisma as never, files as never),
      prisma,
      files,
    };
  }

  it('rejects a metadata-only evidence record', async () => {
    const { service, files } = setup();
    await expect(service.create(dto, undefined, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(files.uploadStaged).not.toHaveBeenCalled();
  });

  it('derives every file field from a quarantined and verified upload', async () => {
    const { service, prisma, files } = setup();
    const file = { originalname: 'learner-evidence.pdf', path: 'staged' };
    const created = await service.create(dto, file as never, user);

    expect(files.uploadStaged).toHaveBeenCalledWith(file, {
      prefix: 'evidence',
      organisationId: 'organisation-1',
      uploadedById: 'user-1',
    });
    expect(prisma.evidence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        uploadId: 'upload-1',
        fileName: 'learner-evidence.pdf',
        fileType: 'application/pdf',
        fileSize: 321,
        storageKey: 'evidence/organisation-1/generated.pdf',
        uploadedById: 'user-1',
      }),
    });
    expect(created).toEqual(expect.objectContaining({ uploadId: 'upload-1' }));
  });
});
