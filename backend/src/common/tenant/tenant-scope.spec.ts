import {
  isLearnerOnly,
  isStaffUser,
  readOrganisationHeader,
  requireOrganisationId,
} from './tenant-scope';
import type { AuthUser } from '../types/request-with-user';

describe('tenant-scope', () => {
  const learner: AuthUser = {
    userId: 'u1',
    email: 'l@x.com',
    organisationId: 'org1',
    roleCodes: ['LEARNER'],
  };
  const staff: AuthUser = {
    userId: 'u2',
    email: 'a@x.com',
    organisationId: 'org1',
    roleCodes: ['FACILITATOR', 'LEARNER'],
  };

  it('reads organisation header aliases', () => {
    expect(
      readOrganisationHeader({ 'x-organisation-id': 'abc' }),
    ).toBe('abc');
    expect(readOrganisationHeader({ 'x-tenant-id': 't1' })).toBe('t1');
  });

  it('requires organisation id', () => {
    expect(() => requireOrganisationId({ ...learner, organisationId: undefined })).toThrow();
    expect(requireOrganisationId(learner)).toBe('org1');
  });

  it('classifies learner-only vs staff', () => {
    expect(isLearnerOnly(learner)).toBe(true);
    expect(isStaffUser(learner)).toBe(false);
    expect(isLearnerOnly(staff)).toBe(false);
    expect(isStaffUser(staff)).toBe(true);
  });
});
