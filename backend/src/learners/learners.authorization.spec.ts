import { LearnersService } from './learners.service';
import type { AuthUser } from '../common/types/request-with-user';

describe('LearnersService allocation authorization', () => {
  const roleCases: Array<[string, AuthUser, Record<string, unknown>]> = [
    ['assessor', {
      userId: 'assessor-1', email: 'assessor@example.test',
      organisationId: 'organisation-1', roleCodes: ['ASSESSOR'],
    }, { AND: expect.any(Array) }],
    ['moderator', {
      userId: 'moderator-1', email: 'moderator@example.test',
      organisationId: 'organisation-1', roleCodes: ['MODERATOR'],
    }, { AND: expect.any(Array) }],
    ['SETA official', {
      userId: 'seta-1', email: 'seta@example.test',
      organisationId: 'organisation-1', roleCodes: ['SETA'],
    }, { AND: expect.any(Array) }],
    ['workplace mentor', {
      userId: 'mentor-1', email: 'mentor@example.test',
      organisationId: 'organisation-1', roleCodes: ['MENTOR'],
    }, { metadata: { path: ['workplaceMentorId'], equals: 'mentor-1' } }],
  ];

  it.each(roleCases)('returns 404 for an unassigned learner requested by a %s', async (_name, actor, scope) => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new LearnersService({
      enrollment: { findFirst },
    } as never, {} as never);

    await expect(service.byId('unassigned-enrollment', 'organisation-1', actor))
      .rejects.toThrow('Learner enrolment not found');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining(scope),
    }));
  });
});
