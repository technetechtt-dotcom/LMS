import { BadRequestException } from '@nestjs/common';
import { LearningProgressService } from './learning-progress.service';

describe('LearningProgressService tenant integrity', () => {
  const user = {
    userId: 'learner-1',
    email: 'learner@org.za',
    organisationId: 'org-a',
    roleCodes: ['LEARNER'],
  };

  it('rejects progress against material from another organisation or programme', async () => {
    const service = new LearningProgressService({
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'enr-1',
          learnerId: 'learner-1',
          programmeId: 'prog-a',
        }),
      },
      learningMaterial: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as never);

    await expect(
      service.record(
        {
          enrollmentId: 'enr-1',
          materialId: 'foreign-material',
          kind: 'MATERIAL_READ',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
