import { competencyFromPercentage } from './competency';

describe('competencyFromPercentage', () => {
  it('returns C when percentage meets pass mark', () => {
    expect(competencyFromPercentage(70, 50)).toBe('C');
    expect(competencyFromPercentage(50, 50)).toBe('C');
  });

  it('returns NYC when below pass mark', () => {
    expect(competencyFromPercentage(49, 50)).toBe('NYC');
    expect(competencyFromPercentage(0, 50)).toBe('NYC');
  });
});
