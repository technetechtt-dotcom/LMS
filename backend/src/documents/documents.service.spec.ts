import { DocumentsService } from './documents.service';

describe('DocumentsService.create tenant injection', () => {
  it('always writes authenticated organisationId', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'd1' });
    const prisma = {
      enrollment: { findFirst: jest.fn() },
      document: { create },
    };
    const files = {
      storageLocator: jest.fn().mockReturnValue('storage://b/k'),
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
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisationId: 'org-auth',
        storageKey: 'k',
        url: 'storage://b/k',
      }),
    });
  });
});
