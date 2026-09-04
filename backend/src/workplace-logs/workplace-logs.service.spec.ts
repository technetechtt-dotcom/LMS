import { WorkplaceLogsService } from './workplace-logs.service';

describe('WorkplaceLogsService mentor allocation', () => {
  it('scopes mentor verification to the allocated mentor', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new WorkplaceLogsService({
      workplaceLog: { findFirst },
    } as never);

    await expect(
      service.mentorVerify(
        'log-1',
        { decision: 'approve' },
        {
          userId: 'mentor-1',
          email: 'mentor@example.com',
          organisationId: 'organisation-1',
          roleCodes: ['MENTOR'],
        },
      ),
    ).rejects.toThrow('Workplace log not found');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          enrollment: expect.objectContaining({
            metadata: {
              path: ['workplaceMentorId'],
              equals: 'mentor-1',
            },
          }),
        }),
      }),
    );
  });
});
