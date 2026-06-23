type ErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

/** Extract the fullest error string we can from Supabase/PostgREST/Auth throws. */
export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;

  if (err instanceof Error) {
    const extra = err as ErrorLike;
    const parts = [err.message];
    if (extra.code) parts.push(`code: ${extra.code}`);
    if (extra.details) parts.push(`details: ${extra.details}`);
    if (extra.hint) parts.push(`hint: ${extra.hint}`);
    if (extra.status) parts.push(`status: ${extra.status}`);
    return parts.filter(Boolean).join(' | ');
  }

  if (typeof err === 'object' && err !== null) {
    const e = err as ErrorLike;
    const parts = [e.message, e.code && `code: ${e.code}`, e.details && `details: ${e.details}`, e.hint && `hint: ${e.hint}`, e.status && `status: ${e.status}`];
    const joined = parts.filter(Boolean).join(' | ');
    if (joined) return joined;
  }

  return 'Unknown error';
}

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password') && (lower.includes('6') || lower.includes('weak'))) {
    return 'Password must be at least 6 characters.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password.';
  }
  if (lower.includes('valid email') || lower.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (lower.includes('row-level security')) {
    return `${message} — likely no auth session yet (email confirmation may be required).`;
  }

  return message;
}
