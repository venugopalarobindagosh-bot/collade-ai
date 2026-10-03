/**
 * Universal AI Response Handler
 *
 * Handles JSON, markdown, and typo-riddled JSON responses from the AI.
 *
 * Steps:
 * 1. Try direct JSON parse
 * 2. Strip markdown fences and try again
 * 3. Try JSON repair (missing quotes, trailing commas)
 * 4. Try truncated JSON repair
 * 5. Fall back to markdown (converted from JSON if needed)
 */

/**
 * Repair common AI JSON typos:
 * - Missing opening quote: `"duration": 4 years"` → `"duration": "4 years"`
 * - Missing quotes around unquoted values
 * - Trailing commas
 */
function repairAIJSON(text) {
  if (!text || typeof text !== 'string') return null;

  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) return null;

    let fixed = text.slice(start, end + 1);

    // Fix 1: Missing opening quote on numeric-starting values
    fixed = fixed.replace(
      /"(\w+)":\s*([0-9][^",}\]]*)"(\s*[,}\]])/g,
      '"$1": "$2"$3'
    );

    // Fix 2: Trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    try {
      const parsed = JSON.parse(fixed);
      if (parsed && typeof parsed === 'object') {
        console.log('[aiResponseHandler] JSON repaired (typo fix)');
        return parsed;
      }
    } catch (e) {}

    // Fix 3: More aggressive — quote unquoted values after colons
    fixed = text.slice(start, end + 1);
    fixed = fixed.replace(
      /"(\w+)":\s*([^"\s\[{][^,\]}]*?)(\s*[,}\]])/g,
      (match, key, val, endChar) => {
        const trimmed = val.trim();
        if (/^(true|false|null|-?\d+(\.\d+)?)$/.test(trimmed)) return match;
        return `"${key}": "${trimmed}"${endChar}`;
      }
    );
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    try {
      const parsed = JSON.parse(fixed);
      if (parsed && typeof parsed === 'object') {
        console.log('[aiResponseHandler] JSON repaired (aggressive)');
        return parsed;
      }
    } catch (e) {}

    return null;
  } catch (err) {
    console.error('[aiResponseHandler] repairAIJSON error:', err);
    return null;
  }
}

/**
 * Repair truncated JSON (existing logic, improved)
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
          console.log('[aiResponseHandler] Truncated JSON repaired');
          return repaired;
        }
      } catch {}
    }

    // Salvage complete objects
    const objPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const matches = s.match(objPattern) || [];
    if (matches.length > 0) {
      const commonArrayKeys = ['degrees', 'careers', 'trends', 'recommendations', 'opportunities', 'paths', 'items', 'results', 'matches'];
      for (const key of commonArrayKeys) {
        if (new RegExp(`"${key}"\\s*:\\s*\\[`).test(s)) {
          const salvaged = matches.map(m => {
            try { return JSON.parse(m); } catch { return null; }
          }).filter(Boolean);

          if (salvaged.length > 0) {
            console.log(`[aiResponseHandler] Salvaged ${salvaged.length} objects`);
            return { [key]: salvaged };
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.error('[aiResponseHandler] repairTruncatedJSON error:', err);
    return null;
  }
}

/**
 * Convert JSON-ish text (that couldn't be parsed) into readable markdown.
 * Used as a LAST resort — better than showing raw JSON to users.
 */
function jsonToReadableMarkdown(text) {
  if (!text) return '';
  if (typeof text !== 'string') return JSON.stringify(text, null, 2);

  // If it doesn't look like JSON, just return as-is
  if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    return text;
  }

  // Try to extract top-level string fields
  let md = '';

  // Extract key: "value" pairs at the top level
  const fieldPattern = /"([a-z_]+)"\s*:\s*"([^"]+)"/gi;
  const fields = [];
  let match;
  while ((match = fieldPattern.exec(text)) !== null) {
    fields.push({ key: match[1], value: match[2] });
  }

  // First field often has the title/name — display it
  const titleField = fields.find(f => ['name', 'title', 'full_title', 'location_name'].includes(f.key));
  if (titleField) {
    md += `# ${titleField.value}\n\n`;
  }

  // Display other simple fields
  for (const f of fields) {
    if (f.key === titleField?.key) continue;
    if (f.key.startsWith('_')) continue;
    const label = f.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    md += `**${label}:** ${f.value}\n\n`;
  }

  // Try to extract objects from arrays
  const careersMatch = text.match(/"careers"\s*:\s*\[([\s\S]*?)\]\s*\}/);
  if (careersMatch) {
    const careerPattern = /"name"\s*:\s*"([^"]+)"[\s\S]*?(?="name"|$)/g;
    const names = [];
    let m;
    while ((m = careerPattern.exec(careersMatch[1])) !== null) {
      names.push(m[1]);
    }
    if (names.length > 0) {
      md += `## Careers\n`;
      names.forEach(n => { md += `- ${n}\n`; });
    }
  }

  // If we extracted nothing useful, return the raw (truncated)
  if (!md.trim()) {
    return text.slice(0, 3000);
  }

  return md.trim();
}

/**
 * Try to extract a JSON object or array from a string.
 */
function tryExtractJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // 1. Direct parse
  try {
    const direct = JSON.parse(raw);
    if (direct && typeof direct === 'object') return direct;
  } catch {}

  // 2. Strip markdown fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const fenced = JSON.parse(fenceMatch[1].trim());
      if (fenced && typeof fenced === 'object') return fenced;
    } catch {
      const repaired = repairAIJSON(fenceMatch[1]) || repairTruncatedJSON(fenceMatch[1]);
      if (repaired) return repaired;
    }
  }

  // 3. Find first { ... } and try parse
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      if (obj && typeof obj === 'object') return obj;
    } catch {
      // Try typo repair first
      const repaired = repairAIJSON(objMatch[0]);
      if (repaired) return repaired;
      // Then truncation repair
      const truncated = repairTruncatedJSON(objMatch[0]);
      if (truncated) return truncated;
    }
  }

  // 4. Find first [ ... ]
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
 * Main handler
 */
export function parseAIResponse(rawResponse) {
  if (rawResponse == null) {
    return { type: 'empty', data: null, raw: '', isEmpty: true };
  }

  if (typeof rawResponse === 'object') {
    const isEmpty =
      !rawResponse ||
      (Array.isArray(rawResponse) && rawResponse.length === 0) ||
      (typeof rawResponse === 'object' && Object.keys(rawResponse).length === 0);

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
      (typeof jsonData === 'object' && Object.keys(jsonData).length === 0);

    if (!isEmpty) {
      return { type: 'json', data: jsonData, raw, isEmpty: false };
    }
  }

  // Not JSON — check if it LOOKS like JSON and convert to markdown
  let cleaned = raw;
  const looksLikeJSON = cleaned.trim().startsWith('{') || cleaned.trim().startsWith('[');

  if (looksLikeJSON) {
    // Convert broken JSON to readable markdown
    console.log('[aiResponseHandler] Looks like JSON but couldn\'t parse — converting to markdown');
    cleaned = jsonToReadableMarkdown(cleaned);
  }

  // Strip common AI artifacts
  cleaned = cleaned
    .replace(/^(response|answer|result)\s*:\s*/i, '')
    .replace(/^```\w*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  return { type: 'markdown', data: null, raw: cleaned, isEmpty: false };
}

/**
 * Extract array from JSON data
 */
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

export { repairTruncatedJSON, repairAIJSON, jsonToReadableMarkdown };