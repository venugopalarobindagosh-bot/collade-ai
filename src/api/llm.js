import { supabase } from './supabaseClient';
import { getFreshAccessToken, AuthRequiredError } from '@/lib/auth';

const FUNCTION_NAME = 'career-search';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Custom error for "out of credits"
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

function broadcastCreditsUpdate(creditsRemaining, premium) {
  if (creditsRemaining === undefined || creditsRemaining === null) return;
  try {
    window.dispatchEvent(
      new CustomEvent('collade:credits-updated', {
        detail: { credits_remaining: creditsRemaining, premium: !!premium },
      })
    );
  } catch (e) {}
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

  if (res.status === 402) {
    let msg = 'You have run out of credits. Please upgrade to continue.';
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) msg = parsed.message;
      broadcastCreditsUpdate(0, false);
    } catch (e) {}
    throw new OutOfCreditsError(msg);
  }

  if (res.status === 429) {
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

/**
 * Non-streaming invoke (kept for backward compatibility)
 */
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

    if (data && typeof data === 'object') {
      broadcastCreditsUpdate(data.credits_remaining, data.premium);
    }

    return parseAIResponse(data);
  } catch (firstErr) {
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

/**
 * STREAMING invoke — calls onToken for each chunk of text
 *
 * @param {Object} options
 * @param {string} options.prompt - The prompt
 * @param {Function} options.onToken - Called with each text chunk: onToken(text)
 * @param {Function} options.onDone - Called when stream completes with full text
 * @param {Function} options.onError - Called with error
 */
export async function invokeLLMStream({ prompt, onToken, onDone, onError }) {
  console.log('[AI-Stream] Starting, prompt length:', prompt?.length);

  let accessToken;
  try {
    accessToken = await getFreshAccessToken();
  } catch (err) {
    console.error('[AI-Stream] No valid session:', err.message);
    const authErr = err instanceof AuthRequiredError
      ? err
      : new AuthRequiredError('Please log in again to use AI features.');
    if (onError) onError(authErr);
    throw authErr;
  }

  const url = `${BASE_URL}/functions/v1/${FUNCTION_NAME}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    apikey: ANON_KEY,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, query: prompt }),
    });
  } catch (fetchErr) {
    console.error('[AI-Stream] Fetch failed:', fetchErr);
    const err = new Error('Failed to connect. Please check your internet and try again.');
    if (onError) onError(err);
    throw err;
  }

  // Handle non-streaming error responses
  if (!res.ok) {
    const text = await res.text();
    let errMsg = 'AI request failed';
    let errCode = null;

    try {
      const parsed = JSON.parse(text);
      errMsg = parsed.message || parsed.error || errMsg;
      errCode = parsed.error;
    } catch {
      errMsg = text || errMsg;
    }

    if (res.status === 402) {
      broadcastCreditsUpdate(0, false);
      const err = new OutOfCreditsError(errMsg);
      if (onError) onError(err);
      throw err;
    }

    if (res.status === 429) {
      const err = new Error('Too many requests. Please wait a moment.');
      err.status = 429;
      if (onError) onError(err);
      throw err;
    }

    if (errCode === 'timeout') {
      const err = new Error('AI is taking too long. Your credit was refunded.');
      err.status = 504;
      if (onError) onError(err);
      throw err;
    }

    const err = new Error(errMsg);
    err.status = res.status;
    if (onError) onError(err);
    throw err;
  }

  if (!res.body) {
    const err = new Error('No response body received');
    if (onError) onError(err);
    throw err;
  }

  // Read the SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let doneEmitted = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = null;
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
          continue;
        }

        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          if (eventType === 'credits') {
            try {
              const parsed = JSON.parse(dataStr);
              broadcastCreditsUpdate(parsed.credits_remaining, parsed.plan === 'premium');
            } catch (e) {}
          } else if (eventType === 'token') {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                fullText += parsed.text;
                if (onToken) onToken(parsed.text);
              }
            } catch (e) {}
          } else if (eventType === 'done') {
            doneEmitted = true;
            if (onDone) onDone(fullText);
          } else if (eventType === 'error') {
            try {
              const parsed = JSON.parse(dataStr);
              const err = new Error(parsed.error || 'Stream error');
              if (onError) onError(err);
            } catch (e) {}
          }
          eventType = null;
        }
      }
    }

    if (!doneEmitted && onDone) onDone(fullText);

  } catch (err) {
    console.error('[AI-Stream] Stream read error:', err);
    if (onError) onError(err);
    throw err;
  }
}

export { AuthRequiredError };