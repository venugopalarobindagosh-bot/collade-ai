import { useState, useRef } from "react";
import { Shield, Search, Loader2, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

const POPULAR = [
  "Software Engineering", "Medicine", "Law", "Data Science", "Architecture",
  "Graphic Design", "Finance", "Nursing", "Marketing", "Cybersecurity",
  "Psychology", "Teaching", "Journalism", "Mechanical Engineering", "Pharmacy"
];

export default function FutureScore() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const analyze = async (term) => {
    const q = term || query.trim();
    if (!q) return;

    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setStreamedText("");
    setParsedItems([]);
    setError(null);

    const prompt = `You are Collade AI, an expert AI-disruption analyst.

Analyze AI future-proofing for: "${q}"

Write a HIGHLY DETAILED analysis, then list 12 scorecards (the main field + 11 related specializations/sub-fields).

=== PART 1: DETAILED ANALYSIS ===

Write 4-5 paragraphs covering:
- What "${q}" actually involves day-to-day
- Which tasks in this field are AI-automatable vs AI-resistant
- Historical disruption patterns in this industry
- Which specializations are safest vs most at-risk
- How the field is likely to evolve 2025-2035

Then 6-8 "AI-Resistant Skills" bullets that will matter most.

Then 5 "Career Pivot Options" bullets — adjacent roles if the field changes.

Then 4-5 "Early Warning Signs" bullets — how to know if your job is at risk.

Then 5 "Recommended Actions" bullets for students entering this field.

=== PART 2: SCORECARDS ===

After the guide, write EXACTLY this marker on its own line:

[ SCORECARDS ]

Then list 12 scorecards, EACH in this EXACT format (no #, no **, no bullets):

Field/Specialization Name
Stream: ${q} — specific sub-field
AI Proof Score: X/10 · Risk Level: Low/Medium/High
Growth Potential: X% over 5 years · Time Horizon: Years until major disruption
Key Reason: 1 sentence explaining the score
Safe Skills: skill1, skill2, skill3
[2-3 sentence description of the specialization and its AI outlook]

(blank line between each scorecard)

RULES:
- REAL sub-fields and specializations
- REAL growth percentages with reasoning
- NEVER say "varies"
- Plain text format, no markdown symbols
- Use [ SCORECARDS ] as the exact marker`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          if (buffer.includes("[ SCORECARDS ]")) {
            const items = extractScorecardsFromMarker(buffer);
            if (items.length > 0) setParsedItems(items);
          }
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        },
        onDone: () => setLoading(false),
        onError: (err) => {
          console.error('[FutureScore] Error:', err);
          setError(err.message || 'Failed to analyze.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[FutureScore] Catch error:', err);
      setError(err.message || 'Failed to analyze.');
      setLoading(false);
    }
  };

  const openCareerDetail = (name) => {
    navigate(`/career-detail?name=${encodeURIComponent(name)}&stream=${encodeURIComponent("Future Proof")}`);
  };

  const guideText = streamedText.split("[ SCORECARDS ]")[0] || "";

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="AI Future-Proof Score" subtitle="See how AI will impact any career — and how to stay ahead" icon={Shield} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && analyze()}
          placeholder="Enter any career or degree to score it..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div className="flex flex-wrap gap-2">
        {POPULAR.map(p => (
          <button key={p} onClick={() => { setQuery(p); analyze(p); }}
            className="text-xs bg-secondary hover:bg-primary/10 hover:text-primary px-2.5 py-1.5 rounded-lg transition-colors font-medium">
            {p}
          </button>
        ))}
      </div>

      <button onClick={() => analyze()} disabled={!query.trim() || loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
        Analyze Future-Proof Score
      </button>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && !streamedText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-heading font-semibold text-primary">🛡️ Scoring with AI trend analysis...</p>
          </div>
        </motion.div>
      )}

      {guideText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-6 sm:p-8"
        >
          <SmartMarkdown text={guideText} />
          {loading && !streamedText.includes("[ SCORECARDS ]") && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground italic">writing...</span>
            </div>
          )}
        </motion.div>
      )}

      {parsedItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              🛡️ {parsedItems.length} specializations analyzed
              {loading && <span className="text-primary italic"> (streaming...)</span>}
            </p>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {parsedItems.map((card, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => openCareerDetail(card.name)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors">{card.name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                </div>
                <div className="space-y-1.5 text-xs">
                  {card.score && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">AI Proof:</span> <span className="font-bold text-primary">{card.score}</span></p>
                  )}
                  {card.risk && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Risk:</span> {card.risk}</p>
                  )}
                  {card.growth && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Growth:</span> {card.growth}</p>
                  )}
                  {card.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {card.tags.map((tag, j) => (
                        <span key={j} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                  {card.description && (
                    <p className="text-muted-foreground line-clamp-2 pt-1">{card.description}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}

function extractScorecardsFromMarker(text) {
  const markerIdx = text.indexOf("[ SCORECARDS ]");
  if (markerIdx === -1) return [];
  const block = text.slice(markerIdx + "[ SCORECARDS ]".length);
  const lines = block.split("\n").map(l => l.trim());
  const items = [];
  let current = null;
  let paragraphs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const isKey = /^(Stream|AI Proof Score|Risk Level|Growth Potential|Time Horizon|Key Reason|Safe Skills)\s*:/i.test(line);
    const isBullet = line.startsWith("-") || line.startsWith("•") || /^\d+\./.test(line);

    if (!isKey && !isBullet && line.length < 80 && !line.endsWith(".")) {
      if (current && (current.score || current.risk)) {
        current.description = paragraphs.join(" ").trim();
        items.push(current);
      }
      current = { name: line, score: "", risk: "", growth: "", tags: [], description: "" };
      paragraphs = [];
      continue;
    }
    if (!current) continue;

    const scoreMatch = line.match(/^AI Proof Score:\s*([^·]+?)(?:\s*·\s*Risk Level:\s*(.+))?$/i);
    if (scoreMatch) {
      current.score = scoreMatch[1].trim();
      if (scoreMatch[2]) current.risk = scoreMatch[2].trim();
      continue;
    }

    const growthMatch = line.match(/^Growth Potential:\s*([^·]+?)(?:\s*·\s*Time Horizon:\s*(.+))?$/i);
    if (growthMatch) {
      current.growth = growthMatch[1].trim();
      if (growthMatch[2]) current.tags.push("⏱️ " + growthMatch[2].trim());
      continue;
    }

    const reasonMatch = line.match(/^Key Reason:\s*(.+)/i);
    if (reasonMatch) { current.tags.push("💡 " + reasonMatch[1].trim()); continue; }

    const skillsMatch = line.match(/^Safe Skills:\s*(.+)/i);
    if (skillsMatch) {
      const skills = skillsMatch[1].split(",").map(s => s.trim()).slice(0, 3);
      skills.forEach(s => current.tags.push("✓ " + s));
      continue;
    }

    paragraphs.push(line);
  }

  if (current && (current.score || current.risk)) {
    current.description = paragraphs.join(" ").trim();
    items.push(current);
  }
  return items;
}