import { AssessmentInstrumentsService } from './assessment-instruments.service';

describe('Assessment instrument independent review', () => {
  const author = {
    userId: 'author-1', email: 'author@example.test',
    organisationId: 'organisation-1', roleCodes: ['FACILITATOR'],
  };
  const reviewer = {
    userId: 'qa-1', email: 'qa@example.test',
    organisationId: 'organisation-1', roleCodes: ['QA_OFFICER'],
  };

  it('prevents the author from approving their own submitted instrument', async () => {
    const update = jest.fn();
    const service = new AssessmentInstrumentsService({
      assessmentInstrument: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'instrument-1', organisationId: 'organisation-1',
          status: 'IN_REVIEW', createdById: author.userId, submittedById: author.userId,
        }),
        update,
      },
    } as never);

    await expect(service.review('instrument-1', true, undefined, author))
      .rejects.toThrow('independent reviewer');
    expect(update).not.toHaveBeenCalled();
  });

  it('allows an independent reviewer to approve and records their identity', async () => {
    const update = jest.fn().mockResolvedValue({ status: 'APPROVED' });
    const service = new AssessmentInstrumentsService({
      assessmentInstrument: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'instrument-1', organisationId: 'organisation-1',
          status: 'IN_REVIEW', createdById: author.userId, submittedById: author.userId,
        }),
        update,
      },
    } as never);

    await expect(service.review('instrument-1', true, 'QA checked', reviewer))
      .resolves.toEqual({ status: 'APPROVED' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'APPROVED', approvedById: reviewer.userId,
      }),
    }));
  });
});
