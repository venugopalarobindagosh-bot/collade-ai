import { supabase } from '@/api/supabaseClient';

export class AuthRequiredError extends Error {
  constructor(message = 'Please log in again to use AI features.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: user.user_metadata?.role || 'user',
  };
}

export async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Returns a valid user JWT for Edge Function calls (JWT verification ON).
 * Refreshes the session automatically if expired or about to expire.
 */
export async function getFreshAccessToken() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[Auth] getUser failed:', userError?.message);
    throw new AuthRequiredError();
  }

  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn('[Auth] No session, attempting refresh...');
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      console.error('[Auth] refreshSession failed:', refreshError?.message);
      throw new AuthRequiredError();
    }
    session = refreshed.session;
  }

  const expiresAt = (session.expires_at ?? 0) * 1000;
  const msUntilExpiry = expiresAt - Date.now();
  if (msUntilExpiry < 120_000) {
    console.log('[Auth] Token expiring soon, refreshing...');
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      session = refreshed.session;
      console.log('[Auth] Token refreshed successfully');
    } else {
      console.warn('[Auth] Proactive refresh failed, using existing token');
    }
  }

  console.log('[Auth] Valid access token ready for user:', user.id);
  return session.access_token;
}

export async function signOut(redirectUrl = '/') {
  await supabase.auth.signOut();
  if (redirectUrl) window.location.href = redirectUrl;
}

export function redirectToLogin(returnPath = '/dashboard') {
  window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
}

export async function signInWithGoogle(redirectPath = '/dashboard') {
  const redirectTo = `${window.location.origin}/login?redirect=${encodeURIComponent(redirectPath)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signInWithEmail(email, redirectPath = '/dashboard') {
  const redirectTo = `${window.location.origin}/login?redirect=${encodeURIComponent(redirectPath)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}
