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

  console.log('[AI] POST', url);

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

  let accessToken;
  try {
    accessToken = await getFreshAccessToken();
  } catch (err) {
    throw err instanceof AuthRequiredError
      ? err
      : new AuthRequiredError('Please log in again to use AI features.');
  }

  try {
    const data = await callEdgeFunction(body, accessToken);
    if (data && typeof data === 'object') {
      broadcastCreditsUpdate(data.credits_remaining, data.premium);
    }
    return parseAIResponse(data);
  } catch (firstErr) {
    if (firstErr.status !== 401) throw firstErr;

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      throw new AuthRequiredError('Session expired. Please log out and log in again.');
    }

    const data = await callEdgeFunction(body, refreshed.session.access_token);
    if (data && typeof data === 'object') {
      broadcastCreditsUpdate(data.credits_remaining, data.premium);
    }
    return parseAIResponse(data);
  }
}

/**
 * STREAMING invoke — calls onToken for each chunk of text
 * Used for chat-style pages (Community, etc.)
 */
export async function invokeLLMStream({ prompt, onToken, onDone, onError }) {
  let accessToken;
  try {
    accessToken = await getFreshAccessToken();
  } catch (err) {
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
    const err = new Error('Failed to connect. Please check your internet and try again.');
    if (onError) onError(err);
    throw err;
  }

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
    if (onError) onError(err);
    throw err;
  }
}

/**
 * STREAMING invoke with array extraction — for card pages
 * Streams JSON in the background and calls onItem for each complete object.
 */
export async function invokeLLMStreamArray({
  prompt,
  onItem,
  onThinking,
  onDone,
  onError,
  arrayKey = null,
}) {
  let accessToken;
  try {
    accessToken = await getFreshAccessToken();
  } catch (err) {
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
    const err = new Error('Failed to connect. Please check your internet.');
    if (onError) onError(err);
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    let errMsg = 'AI request failed';
    try {
      const parsed = JSON.parse(text);
      errMsg = parsed.message || parsed.error || errMsg;
    } catch {}
    if (res.status === 402) {
      broadcastCreditsUpdate(0, false);
      const err = new OutOfCreditsError(errMsg);
      if (onError) onError(err);
      throw err;
    }
    const err = new Error(errMsg);
    err.status = res.status;
    if (onError) onError(err);
    throw err;
  }

  if (!res.body) {
    const err = new Error('No response body');
    if (onError) onError(err);
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let jsonBuffer = '';
  let itemsExtracted = 0;
  let doneEmitted = false;

  // Rotating thinking messages
  const thinkingStages = [
    '💭 Analyzing your request...',
    '🔍 Finding the best options...',
    '📊 Computing details...',
    '✨ Finalizing your results...',
  ];
  let thinkingIndex = 0;
  const thinkingInterval = setInterval(() => {
    if (onThinking && thinkingIndex < thinkingStages.length) {
      onThinking(thinkingStages[thinkingIndex]);
      thinkingIndex++;
    }
  }, 2500);

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
                jsonBuffer += parsed.text;
                const extracted = extractCompleteObjects(jsonBuffer, arrayKey, itemsExtracted);
                if (extracted && extracted.length > 0) {
                  for (const item of extracted) {
                    itemsExtracted++;
                    if (onItem) onItem(item, itemsExtracted - 1);
                  }
                }
              }
            } catch (e) {}
          } else if (eventType === 'done') {
            doneEmitted = true;
            if (onDone) onDone(itemsExtracted);
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
    if (!doneEmitted && onDone) onDone(itemsExtracted);
  } catch (err) {
    if (onError) onError(err);
    throw err;
  } finally {
    clearInterval(thinkingInterval);
  }
}

/**
 * Extract complete objects from a partially-streamed JSON array.
 */
function extractCompleteObjects(jsonText, arrayKey, alreadyExtracted) {
  if (!jsonText || typeof jsonText !== 'string') return [];

  let arrayStart;
  const keysToTry = arrayKey
    ? [arrayKey]
    : ['degrees', 'careers', 'trends', 'recommendations', 'opportunities', 'results', 'items', 'matches', 'paths', 'courses', 'questions'];

  for (const key of keysToTry) {
    const keyPattern = new RegExp(`"${key}"\\s*:\\s*\\[`);
    const match = jsonText.match(keyPattern);
    if (match) {
      arrayStart = match.index + match[0].length;
      break;
    }
  }

  if (arrayStart === undefined) return [];

  const objects = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let objStart = -1;

  for (let i = arrayStart; i < jsonText.length; i++) {
    const char = jsonText[i];

    if (escape) { escape = false; continue; }
    if (char === '\\') { escape = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (char === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const objText = jsonText.slice(objStart, i + 1);
        try {
          const obj = JSON.parse(objText);
          objects.push(obj);
        } catch (e) {}
        objStart = -1;
      }
    } else if (char === ']' && depth === 0) {
      break;
    }
  }

  return objects.slice(alreadyExtracted);
}

export { AuthRequiredError };