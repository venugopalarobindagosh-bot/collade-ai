import { supabase } from './supabaseClient';
import { getFreshAccessToken, AuthRequiredError } from '@/lib/auth';

const FUNCTION_NAME = 'career-search';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Custom error for "out of credits" so pages can react appropriately
export class OutOfCreditsError extends Error {
  constructor(message = 'You have run out of credits. Please upgrade to continue.') {
    super(message);
    this.name = 'OutOfCreditsError';
    this.code = 'out_of_credits';
  }
}

function parseAIResponse(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  if (data.result !== undefined) return data.result;
  if (data.response !== undefined) return data.response;
  if (data.text !== undefined) return data.text;
  if (data.content !== undefined) return data.content;
  if (data.answer !== undefined) return data.answer;
  if (data.message !== undefined) return data.message;
  return data;
}

/**
 * Broadcast the new credit balance to any component listening.
 * useCredits() will pick this up and re-render.
 */
function broadcastCreditsUpdate(creditsRemaining, premium) {
  if (creditsRemaining === undefined || creditsRemaining === null) return;
  try {
    window.dispatchEvent(
      new CustomEvent('collade:credits-updated', {
        detail: { credits_remaining: creditsRemaining, premium: !!premium },
      })
    );
  } catch (e) {
    // window not available (SSR) — ignore
  }
}

async function callEdgeFunction(body, accessToken) {
  const url = `${BASE_URL}/functions/v1/${FUNCTION_NAME}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    apikey: ANON_KEY,
    'Content-Type': 'application/json',
  };

  console.log('[AI] POST', url, '| token:', accessToken ? `${accessToken.slice(0, 20)}...` : 'MISSING');

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log('[AI] Response status:', res.status);

  // ── Handle specific status codes ──
  if (res.status === 402) {
    // Out of credits
    let msg = 'You have run out of credits. Please upgrade to continue.';
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) msg = parsed.message;
      broadcastCreditsUpdate(0, false);
    } catch (e) {}
    throw new OutOfCreditsError(msg);
  }

  if (res.status === 429) {
    // Rate limited
    const err = new Error('Too many requests. Please wait a moment and try again.');
    err.status = 429;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(text || `AI request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { raw: text };
  }
  return parsed;
}

export async function invokeLLM({ prompt, response_json_schema, add_context_from_internet }) {
  const body = {
    prompt,
    query: prompt,
    response_json_schema,
    add_context_from_internet,
  };

  console.log('[AI] invokeLLM start, prompt length:', prompt?.length);

  let accessToken;
  try {
    accessToken = await getFreshAccessToken();
  } catch (err) {
    console.error('[AI] No valid session:', err.message);
    throw err instanceof AuthRequiredError
      ? err
      : new AuthRequiredError('Please log in again to use AI features.');
  }

  try {
    const data = await callEdgeFunction(body, accessToken);
    console.log('[AI] Success');

    // Server returns credits_remaining — broadcast to UI
    if (data && typeof data === 'object') {
      broadcastCreditsUpdate(data.credits_remaining, data.premium);
    }

    return parseAIResponse(data);
  } catch (firstErr) {
    // Don't retry on 401, 402, 429
    if (firstErr.status !== 401) {
      console.error('[AI] Request failed:', firstErr.message);
      throw firstErr;
    }

    console.warn('[AI] Got 401 — refreshing token and retrying...');

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      console.error('[AI] Token refresh failed:', refreshError?.message);
      throw new AuthRequiredError('Session expired. Please log out and log in again.');
    }

    try {
      const data = await callEdgeFunction(body, refreshed.session.access_token);
      console.log('[AI] Success after token refresh');

      if (data && typeof data === 'object') {
        broadcastCreditsUpdate(data.credits_remaining, data.premium);
      }

      return parseAIResponse(data);
    } catch (retryErr) {
      console.error('[AI] Retry failed:', retryErr.message);
      if (retryErr.status === 401) {
        throw new AuthRequiredError('Authentication failed. Please log out and log in again.');
      }
      throw retryErr;
    }
  }
}

export { AuthRequiredError };