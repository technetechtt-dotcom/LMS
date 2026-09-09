import { OrganisationsService } from './organisations.service';

describe('OrganisationsService tenant enumeration', () => {
  it('returns only the active organisation to tenant users', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'organisation-1' }]);
    const service = new OrganisationsService({
      organisation: { findMany },
    } as never);
    await service.list({
      userId: 'admin-1',
      email: 'admin@example.com',
      organisationId: 'organisation-1',
      roleCodes: ['ADMIN'],
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { id: 'organisation-1', deletedAt: null },
    });
  });

  it('allows an explicit platform administrator to enumerate organisations', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new OrganisationsService({
      organisation: { findMany },
    } as never);
    await service.list({
      userId: 'platform-1',
      email: 'platform@example.com',
      roleCodes: ['PLATFORM_ADMIN'],
    });
    expect(findMany).toHaveBeenCalledWith({ where: { deletedAt: null } });
  });
});
