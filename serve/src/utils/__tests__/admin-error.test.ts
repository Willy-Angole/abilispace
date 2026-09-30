import { ZodError, z } from 'zod';
import { isSafeAdminMessage, safeZodMessage } from '../admin-error';

describe('isSafeAdminMessage', () => {
  it('allows intentional admin messages', () => {
    expect(isSafeAdminMessage('Invalid credentials')).toBe(true);
    expect(isSafeAdminMessage('Account is temporarily locked. Please try again later.')).toBe(true);
    expect(isSafeAdminMessage('Article not found')).toBe(true);
    expect(isSafeAdminMessage('Only image files are allowed')).toBe(true);
  });

  it('hides database errors', () => {
    expect(isSafeAdminMessage('column "is_time_sensitive" of relation "articles" does not exist')).toBe(false);
    expect(isSafeAdminMessage('duplicate key value violates unique constraint "users_email_key"')).toBe(false);
    expect(isSafeAdminMessage('select * from users where email = $1')).toBe(false);
  });
});

describe('safeZodMessage', () => {
  it('returns the first issue when it is short and safe', () => {
    const parsed = z.object({ title: z.string().min(1) }).safeParse({ title: '' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(safeZodMessage(parsed.error)).toMatch(/string|at least|too small|Required/i);
    }
  });

  it('hides a message that looks like SQL', () => {
    const error = new ZodError([
      {
        code: 'custom',
        path: ['title'],
        message: 'select * from articles',
      },
    ]);
    expect(safeZodMessage(error)).toBe('Invalid input');
  });
});
