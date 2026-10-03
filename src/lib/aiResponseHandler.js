/**
 * Universal AI Response Handler
 *
 * Handles both JSON and markdown responses from the AI edge function.
 * Prevents blank pages when AI returns markdown instead of structured JSON.
 *
 * Includes:
 * - JSON extraction from raw text
 * - Truncated JSON repair
 * - Artifact stripping (response:, answer:, code fences)
 *
 * Usage:
 *   const parsed = parseAIResponse(rawResponse);
 *   if (parsed.type === 'json') → render structured cards using parsed.data
 *   if (parsed.type === 'markdown' || parsed.type === 'text') → render markdown using parsed.raw
 */

/**
 * Repair truncated JSON by:
 * 1. Trimming back to last complete object in array
 * 2. Closing open brackets/braces
 */
function repairTruncatedJSON(str) {
  if (!str || typeof str !== 'string') return null;

  try {
    const startIdx = str.indexOf('{');
    if (startIdx === -1) return null;

    let s = str.slice(startIdx);

    const lastCompleteObj = s.lastIndexOf('},');
    const lastCompleteArr = s.lastIndexOf('}]');

    let cutoff = Math.max(lastCompleteObj, lastCompleteArr);

    if (cutoff > 0) {
      s = s.slice(0, cutoff + 1);

      const opens = (s.match(/\{/g) || []).length;
      const closes = (s.match(/\}/g) || []).length;
      for (let i = 0; i < opens - closes; i++) s += '}';

      const arrOpens = (s.match(/\[/g) || []).length;
      const arrCloses = (s.match(/\]/g) || []).length;
      for (let i = 0; i < arrOpens - arrCloses; i++) s += ']';

      try {
        const repaired = JSON.parse(s);
        if (repaired && typeof repaired === 'object') {
          console.log('[aiResponseHandler] Repaired truncated JSON successfully');
          return repaired;
        }
      } catch {}
    }

    const objPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const matches = s.match(objPattern) || [];
    if (matches.length > 0) {
      const degreesPattern = /"degrees"\s*:\s*\[/;
      if (degreesPattern.test(s)) {
        const salvaged = matches.map(m => {
          try { return JSON.parse(m); } catch { return null; }
        }).filter(Boolean);

        if (salvaged.length > 0) {
          console.log(`[aiResponseHandler] Salvaged ${salvaged.length} objects from truncated JSON`);
          return { degrees: salvaged };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('[aiResponseHandler] Repair failed:', err);
    return null;
  }
}

function tryExtractJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;

  try {
    const direct = JSON.parse(raw);
    if (direct && typeof direct === 'object') return direct;
  } catch {}

  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const fenced = JSON.parse(fenceMatch[1].trim());
      if (fenced && typeof fenced === 'object') return fenced;
    } catch {
      const repaired = repairTruncatedJSON(fenceMatch[1]);
      if (repaired) return repaired;
    }
  }

  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      if (obj && typeof obj === 'object') return obj;
    } catch {
      const repaired = repairTruncatedJSON(objMatch[0]);
      if (repaired) return repaired;
    }
  }

  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }

  return null;
}

export function parseAIResponse(rawResponse) {
  if (rawResponse == null) {
    return { type: 'empty', data: null, raw: '', isEmpty: true };
  }

  if (typeof rawResponse === 'object') {
    const isEmpty =
      !rawResponse ||
      (Array.isArray(rawResponse) && rawResponse.length === 0) ||
      (typeof rawResponse === 'object' &&
        Object.keys(rawResponse).length === 0);

    return {
      type: isEmpty ? 'empty' : 'json',
      data: rawResponse,
      raw: JSON.stringify(rawResponse),
      isEmpty,
    };
  }

  const raw = String(rawResponse).trim();

  if (!raw) {
    return { type: 'empty', data: null, raw: '', isEmpty: true };
  }

  const jsonData = tryExtractJSON(raw);

  if (jsonData) {
    const isEmpty =
      (Array.isArray(jsonData) && jsonData.length === 0) ||
      (typeof jsonData === 'object' &&
        Object.keys(jsonData).length === 0);

    if (!isEmpty) {
      return { type: 'json', data: jsonData, raw, isEmpty: false };
    }
  }

  // Clean common AI artifacts before returning markdown
  let cleaned = raw
    .replace(/^(response|answer|result)\s*:\s*/i, '')
    .replace(/^```\w*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  return { type: 'markdown', data: null, raw: cleaned, isEmpty: false };
}

export function extractArray(data, preferredKeys = []) {
  if (!data) return [];

  if (Array.isArray(data)) return data;

  for (const key of preferredKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  const commonKeys = [
    'matches', 'results', 'items', 'data', 'careers', 'degrees',
    'trends', 'recommendations', 'opportunities', 'paths', 'list', 'entries',
  ];
  for (const key of commonKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  const arrayValues = Object.values(data).filter(Array.isArray);
  if (arrayValues.length === 1) return arrayValues[0];

  return [];
}

export { repairTruncatedJSON };