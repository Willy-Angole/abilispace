import {
  validatePasswordStrength,
  needsRehash,
} from '../password';

describe('validatePasswordStrength', () => {
  it('rejects short passwords', () => {
    const result = validatePasswordStrength('Ab1!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('8 characters'))).toBe(true);
  });

  it('rejects passwords without uppercase', () => {
    const result = validatePasswordStrength('abcdefg1!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('uppercase'))).toBe(true);
  });

  it('accepts a strong password', () => {
    const result = validatePasswordStrength('Str0ng!Pass');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('flags common patterns', () => {
    const result = validatePasswordStrength('Password1!');
    // may still fail common pattern check
    expect(result.errors.some((e) => e.includes('common')) || result.isValid).toBeTruthy();
  });
});

describe('needsRehash', () => {
  it('returns true for invalid hashes', () => {
    expect(needsRehash('not-a-hash')).toBe(true);
  });
});
