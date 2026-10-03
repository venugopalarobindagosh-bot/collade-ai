import { useState } from "react";
import { MapPin, Search, Globe, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { invokeLLMStream } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import { parseAIResponse } from "@/lib/aiResponseHandler";
import FeatureGate from "../components/FeatureGate";
import SectionHeader from "../components/SectionHeader";
import CareerCard from "../components/CareerCard";
import { motion } from "framer-motion";

const POPULAR_LOCATIONS = [
  { name: "Tokyo, Japan", emoji: "🗼" },
  { name: "London, UK", emoji: "🇬🇧" },
  { name: "New York, USA", emoji: "🗽" },
  { name: "Berlin, Germany", emoji: "🇩🇪" },
  { name: "Singapore", emoji: "🇸🇬" },
  { name: "Toronto, Canada", emoji: "🇨🇦" },
  { name: "Sydney, Australia", emoji: "🇦🇺" },
  { name: "Dubai, UAE", emoji: "🇦🇪" },
  { name: "Seoul, South Korea", emoji: "🇰🇷" },
  { name: "Amsterdam, Netherlands", emoji: "🇳🇱" },
  { name: "Bangalore, India", emoji: "🇮🇳" },
  { name: "Zurich, Switzerland", emoji: "🇨🇭" },
];

const THINKING_STAGES = [
  '🌍 Exploring this location...',
  '📊 Gathering cost of living data...',
  '🎓 Finding top universities...',
  '💼 Computing career opportunities...',
];

/**
 * Repair common AI JSON typos:
 * - Missing opening quote: `"duration": 4 years"` → `"duration": "4 years"`
 * - Trailing commas: `{...,}` → `{...}`
 * - Unquoted values
 */
function repairAIJSON(text) {
  if (!text || typeof text !== 'string') return null;

  try {
    // Extract JSON object (from first { to last })
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) return null;

    let fixed = text.slice(start, end + 1);

    // Fix 1: Missing opening quote before unquoted value that ends with quote
    // Pattern: `"key": 4 years"` → `"key": "4 years"`
    fixed = fixed.replace(
      /"(\w+)":\s*([0-9][^",}\]]*)"(\s*[,}\]])/g,
      '"$1": "$2"$3'
    );

    // Fix 2: Trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Try parse
    try {
      const parsed = JSON.parse(fixed);
      console.log('[DreamLocation] JSON repaired successfully');
      return parsed;
    } catch (e) {
      console.warn('[DreamLocation] Repair attempt 1 failed:', e.message);
    }

    // Fix 3: More aggressive — quote any unquoted values after colons
    fixed = fixed.replace(
      /"(\w+)":\s*([^"\s\[{][^,\]}]*?)(\s*[,}\]])/g,
      (match, key, val, end) => {
        const trimmed = val.trim();
        // Skip valid numbers/booleans/null
        if (/^(true|false|null|-?\d+(\.\d+)?)$/.test(trimmed)) return match;
        return `"${key}": "${trimmed}"${end}`;
      }
    );

    try {
      const parsed = JSON.parse(fixed);
      console.log('[DreamLocation] JSON repaired successfully (attempt 2)');
      return parsed;
    } catch (e) {
      console.warn('[DreamLocation] Repair attempt 2 failed:', e.message);
    }

    // Fix 4: Convert broken JSON into markdown instead
    // Extract careers array roughly and produce readable output
    return null;
  } catch (err) {
    console.error('[DreamLocation] Repair error:', err);
    return null;
  }
}

/**
 * Convert raw JSON text (when parsing fails) to readable markdown
 */
function jsonToMarkdown(text) {
  if (!text) return '';

  // Extract key fields with regex
  const overview = text.match(/"overview"\s*:\s*"([^"]+)"/)?.[1] || '';
  const costOfLiving = text.match(/"cost_of_living"\s*:\s*"([^"]+)"/)?.[1] || '';
  const salary = text.match(/"avg_graduate_salary"\s*:\s*"([^"]+)"/)?.[1] || '';
  const visa = text.match(/"visa_info"\s*:\s*"([^"]+)"/)?.[1] || '';

  // Extract universities
  const uniMatch = text.match(/"top_universities"\s*:\s*\[([^\]]+)\]/);
  const universities = uniMatch
    ? uniMatch[1].split(',').map(u => u.trim().replace(/^"|"$/g, '')).filter(Boolean)
    : [];

  // Extract careers — find each {"name": ...} block
  const careers = [];
  const careerPattern = /\{\s*"name"\s*:\s*"([^"]+)"[\s\S]*?"salary_range"\s*:\s*"([^"]+)"[\s\S]*?\}/g;
  let match;
  while ((match = careerPattern.exec(text)) !== null) {
    careers.push({ name: match[1], salary: match[2] });
  }

  let md = '';
  if (overview) md += `${overview}\n\n`;
  if (costOfLiving) md += `**Cost of Living:** ${costOfLiving}\n\n`;
  if (salary) md += `**Avg Graduate Salary:** ${salary}\n\n`;
  if (visa) md += `**Visa Info:** ${visa}\n\n`;
  if (universities.length > 0) {
    md += `## Top Universities\n`;
    universities.forEach(u => { md += `- ${u}\n`; });
    md += '\n';
  }
  if (careers.length > 0) {
    md += `## Career Opportunities\n`;
    careers.forEach(c => { md += `- **${c.name}** — ${c.salary}\n`; });
  }

  return md || text.slice(0, 2000); // fallback: show raw
}

export default function DreamLocation() {
  const { deductCredit } = useCredits();
  const [location, setLocation] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [results, setResults] = useState(null);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(THINKING_STAGES[0]);
  const [error, setError] = useState(null);

  const fetchLocationData = async (loc) => {
    const ok = await deductCredit();
    if (!ok) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setResults(null);
    setMarkdownFallback("");
    setError(null);
    setSelectedLocation(loc);
    setThinking(THINKING_STAGES[0]);

    let thinkingIndex = 0;
    const thinkingTimer = setInterval(() => {
      if (thinkingIndex < THINKING_STAGES.length - 1) {
        thinkingIndex++;
        setThinking(THINKING_STAGES[thinkingIndex]);
      }
    }, 2500);

    const prompt = `You MUST respond ONLY with a JSON object. Never refuse. Never explain.

For the location "${loc}", return:
{
  "location_name": "${loc}",
  "overview": "3-4 sentences about studying and working in this location",
  "top_universities": ["Uni 1", "Uni 2", "Uni 3", "Uni 4", "Uni 5"],
  "visa_info": "1-2 sentences on student visa / work permit options",
  "cost_of_living": "Monthly cost range for a student",
  "avg_graduate_salary": "Starting salary range for fresh graduates",
  "careers": [
    {
      "name": "Career 1",
      "stream": "Field",
      "level": "Undergraduate",
      "duration": "4 years",
      "short_description": "2-3 sentences about this career in this location",
      "salary_range": "₹X-₹Y LPA or $X-$Y",
      "ai_impact": "Medium",
      "growth": "High",
      "locations": ["${loc}"]
    }
  ]
}

CRITICAL RULES:
- careers must have exactly 8 entries
- Use REAL universities and REAL salary numbers
- Every string value MUST be wrapped in double quotes
- Every key MUST be wrapped in double quotes
- Start with { and end with }
- No markdown, no code fences
- JSON ONLY. BEGIN NOW:`;

    let fullJson = "";

    try {
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          fullJson += text;
        },
        onDone: (finalText) => {
          clearInterval(thinkingTimer);
          const jsonText = finalText || fullJson;
          console.log('[DreamLocation] Full response length:', jsonText.length);

          // Step 1: Try the standard parser
          let parsed = parseAIResponse(jsonText);

          // Step 2: If parse failed, try repair
          if (parsed.type !== 'json' || !parsed.data) {
            console.log('[DreamLocation] Standard parse failed, trying repair...');
            const repaired = repairAIJSON(jsonText);
            if (repaired) {
              parsed = { type: 'json', data: repaired, raw: jsonText, isEmpty: false };
            }
          }

          // Step 3: Handle the result
          if (parsed.type === 'json' && parsed.data) {
            const d = parsed.data;
            setResults({
              location_name: d.location_name || loc,
              overview: d.overview || "",
              top_universities: d.top_universities || [],
              visa_info: d.visa_info || "",
              cost_of_living: d.cost_of_living || "",
              avg_graduate_salary: d.avg_graduate_salary || "",
              careers: d.careers || [],
            });
          } else {
            // Step 4: Last resort — convert to markdown
            console.log('[DreamLocation] Using markdown fallback');
            setMarkdownFallback(jsonToMarkdown(jsonText));
          }
          setLoading(false);
        },
        onError: (err) => {
          clearInterval(thinkingTimer);
          console.error("[DreamLocation] Error:", err);
          setError(err.message || "Failed to fetch location data.");
          setLoading(false);
        },
      });
    } catch (err) {
      clearInterval(thinkingTimer);
      console.error("[DreamLocation] Catch error:", err);
      setError(err.message || "Failed to fetch location data.");
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (location.trim()) {
      fetchLocationData(location.trim());
    }
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader
        title="Dream Location"
        subtitle="Type any city or country — discover courses, careers, and opportunities there"
        icon={MapPin}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Type a city or country — 'Tokyo', 'Germany', 'Silicon Valley'..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Popular Destinations</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {POPULAR_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              onClick={() => {
                setLocation(loc.name);
                fetchLocationData(loc.name);
              }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                selectedLocation === loc.name
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border hover:border-primary/30"
              }`}
            >
              <span className="text-base">{loc.emoji}</span>
              <span className="truncate">{loc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-heading font-semibold text-primary">{thinking}</p>
          </div>
        </motion.div>
      )}

      {!loading && results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-bold">{results.location_name || selectedLocation}</h3>
            </div>
            {results.overview && <p className="text-sm text-muted-foreground">{results.overview}</p>}

            <div className="grid sm:grid-cols-3 gap-3">
              {results.avg_graduate_salary && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Graduate Salary</p>
                  <p className="font-heading font-bold mt-0.5">{results.avg_graduate_salary}</p>
                </div>
              )}
              {results.cost_of_living && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost of Living</p>
                  <p className="font-heading font-bold mt-0.5">{results.cost_of_living}</p>
                </div>
              )}
              {results.visa_info && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visa Info</p>
                  <p className="text-xs mt-0.5">{results.visa_info}</p>
                </div>
              )}
            </div>

            {results.top_universities?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Universities</p>
                <div className="flex flex-wrap gap-1.5">
                  {results.top_universities.map((uni, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium">
                      {uni}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {results.careers?.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{results.careers.length} programs</span> available in {selectedLocation}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {results.careers.map((career, i) => (
                  <CareerCard key={i} career={career} index={i} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {!loading && markdownFallback && !results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card border border-border rounded-xl p-6 prose prose-invert prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
            prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1
            prose-p:text-muted-foreground prose-p:my-1.5
            prose-li:text-muted-foreground prose-li:my-0.5
            prose-strong:text-foreground
          ">
            <ReactMarkdown>{markdownFallback}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}