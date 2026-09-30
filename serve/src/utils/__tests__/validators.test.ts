import {
  registerSchema,
  loginSchema,
  passwordSchema,
  uuidSchema,
  createArticleSchema,
} from '../validators';

describe('passwordSchema', () => {
  it('accepts valid password', () => {
    expect(() => passwordSchema.parse('ValidPass1!')).not.toThrow();
  });

  it('rejects weak password', () => {
    expect(() => passwordSchema.parse('weak')).toThrow();
  });
});

describe('loginSchema', () => {
  it('requires email and password', () => {
    expect(() =>
      loginSchema.parse({ email: 'user@example.com', password: 'x' })
    ).not.toThrow();
    expect(() => loginSchema.parse({ email: 'bad', password: '' })).toThrow();
  });
});

describe('registerSchema', () => {
  it('accepts member registration payload', () => {
    const data = registerSchema.parse({
      email: 'member@example.com',
      password: 'ValidPass1!',
      firstName: 'Ada',
      lastName: 'Lovelace',
      accountType: 'member',
    });
    expect(data.email).toBe('member@example.com');
    expect(data.accountType).toBe('member');
  });
});

describe('createArticleSchema', () => {
  it('accepts a valid article and blank optional urls', () => {
    const article = createArticleSchema.parse({
      title: 'A title',
      summary: 'A summary',
      content: 'The story',
      category: 'policy',
      source: 'GDA',
      sourceUrl: '',
      imageUrl: '',
      priority: 'high',
      isTimeSensitive: true,
    });
    expect(article.category).toBe('policy');
    expect(article.sourceUrl).toBeUndefined();
    expect(article.isTimeSensitive).toBe(true);
  });

  it('rejects an unknown category', () => {
    expect(() =>
      createArticleSchema.parse({
        title: 'A title',
        summary: 'A summary',
        content: 'The story',
        category: 'gossip',
        source: 'GDA',
      })
    ).toThrow();
  });
});

describe('uuidSchema', () => {
  it('validates UUIDs', () => {
    expect(() =>
      uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')
    ).not.toThrow();
    expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
  });
});
