import { DocumentsService } from './documents.service';

describe('DocumentsService.create tenant injection', () => {
  it('always writes authenticated organisationId', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'd1' });
    const prisma = {
      enrollment: { findFirst: jest.fn() },
      document: { create },
    };
    const files = {
      assertValidStorageKey: jest
        .fn()
        .mockImplementation((key: string) => `uploads/org-auth/${key}`),
      storageLocator: jest.fn().mockReturnValue('storage://b/uploads/org-auth/k'),
    };
    const svc = new DocumentsService(prisma as never, files as never);
    await svc.create(
      {
        category: 'other',
        name: 'x',
        storageKey: 'k',
        url: 'https://evil.example/override',
      } as never,
      {
        userId: 'u1',
        email: 'a@x.com',
        organisationId: 'org-auth',
        roleCodes: ['ADMIN'],
      },
    );
    expect(files.assertValidStorageKey).toHaveBeenCalledWith('k', 'org-auth');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisationId: 'org-auth',
        storageKey: 'uploads/org-auth/k',
        url: 'storage://b/uploads/org-auth/k',
      }),
    });
  });
});
