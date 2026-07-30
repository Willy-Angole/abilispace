import { durationToMs, COOKIE_NAMES } from '../cookies';

describe('durationToMs', () => {
  it('parses minutes', () => {
    expect(durationToMs('15m')).toBe(15 * 60 * 1000);
  });

  it('parses days', () => {
    expect(durationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('falls back for invalid input', () => {
    expect(durationToMs('nope')).toBe(15 * 60 * 1000);
  });
});

describe('COOKIE_NAMES', () => {
  it('uses stable cookie names', () => {
    expect(COOKIE_NAMES.access).toBe('abilispace_access');
    expect(COOKIE_NAMES.refresh).toBe('abilispace_refresh');
  });
});
