/**
 * Universal AI Response Handler
 *
 * Handles both JSON and markdown responses from the AI edge function.
 * Prevents blank pages when AI returns markdown instead of structured JSON.
 *
 * Usage:
 *   const parsed = parseAIResponse(rawResponse);
 *   if (parsed.type === 'json') → render structured cards using parsed.data
 *   if (parsed.type === 'markdown' || parsed.type === 'text') → render markdown using parsed.raw
 */

/**
 * Try to extract a JSON object or array from a string.
 * Handles:
 * - Plain JSON responses: `{...}` or `[...]`
 * - JSON wrapped in markdown code fences: ```json\n{...}\n```
 * - JSON preceded/followed by prose
 */
function tryExtractJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // 1. Try direct parse (rarely works but cheap)
  try {
    const direct = JSON.parse(raw);
    if (direct && typeof direct === 'object') return direct;
  } catch {}

  // 2. Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const fenced = JSON.parse(fenceMatch[1].trim());
      if (fenced && typeof fenced === 'object') return fenced;
    } catch {}
  }

  // 3. Find first { ... } that parses as valid JSON
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      if (obj && typeof obj === 'object') return obj;
    } catch {}
  }

  // 4. Find first [ ... ] that parses as valid JSON
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }

  return null;
}

/**
 * Main handler — returns a consistent shape regardless of AI output format.
 *
 * Returns: {
 *   type: 'json' | 'markdown' | 'empty',
 *   data: object|array|null,   // parsed JSON if available
 *   raw: string,               // original string
 *   isEmpty: boolean,          // true if nothing useful to display
 * }
 */
export function parseAIResponse(rawResponse) {
  // Handle null/undefined
  if (rawResponse == null) {
    return { type: 'empty', data: null, raw: '', isEmpty: true };
  }

  // If AI already returned an object (invokeLLM parsed it)
  if (typeof rawResponse === 'object') {
    // Check if the object is meaningful
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

  // It's a string
  const raw = String(rawResponse).trim();

  if (!raw) {
    return { type: 'empty', data: null, raw: '', isEmpty: true };
  }

  // Try to extract JSON
  const jsonData = tryExtractJSON(raw);

  if (jsonData) {
    // Check if extracted data is meaningful
    const isEmpty =
      (Array.isArray(jsonData) && jsonData.length === 0) ||
      (typeof jsonData === 'object' &&
        Object.keys(jsonData).length === 0);

    if (!isEmpty) {
      return { type: 'json', data: jsonData, raw, isEmpty: false };
    }
  }

  // Not JSON — return as markdown
  return { type: 'markdown', data: null, raw, isEmpty: false };
}

/**
 * Convenience helper — tries multiple possible keys for an array in JSON data.
 * Many AI responses use different keys: "matches", "results", "items", "data", "careers", etc.
 */
export function extractArray(data, preferredKeys = []) {
  if (!data) return [];

  // Direct array
  if (Array.isArray(data)) return data;

  // Try preferred keys first
  for (const key of preferredKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  // Try common fallback keys
  const commonKeys = [
    'matches', 'results', 'items', 'data', 'careers', 'degrees',
    'trends', 'recommendations', 'opportunities', 'paths', 'list', 'entries',
  ];
  for (const key of commonKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  // If data has exactly one array value, return it
  const arrayValues = Object.values(data).filter(Array.isArray);
  if (arrayValues.length === 1) return arrayValues[0];

  // Nothing found
  return [];
}