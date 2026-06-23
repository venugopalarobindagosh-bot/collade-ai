import { useState } from "react";
import { Shield, Search, Loader2, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { invokeLLM } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

const POPULAR = [
  "Software Engineering", "Medicine", "Law", "Data Science", "Architecture",
  "Graphic Design", "Finance", "Nursing", "Marketing", "Cybersecurity",
  "Psychology", "Teaching", "Journalism", "Mechanical Engineering", "Pharmacy"
];

export default function FutureScore() {
  const { deductCredit } = useCredits();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("score");
  const [error, setError] = useState(null);

  const analyze = async (term) => {
    const q = term || query.trim();
    if (!q) return;
    
    const spent = await deductCredit();
    if (!spent) { 
      window.dispatchEvent(new CustomEvent("collade:upgrade")); 
      return; 
    }
    
    setLoading(true);
    setResults(null);
    setError(null);
    
    try {
      const prompt = `Analyze the AI-future-proofing potential of: "${q}". Generate a comprehensive AI Future-Proof Scorecard.

Provide scores and analysis for the main field AND 5-6 related specializations/sub-fields. Rate each on:
- AI-proof score (1-10, where 10 = very safe from AI disruption)
- Risk level (Low/Medium/High)
- Growth potential (%)
- Time horizon (years until significant AI impact)

Be realistic and data-driven based on current AI trends (2025-2030).

Return a JSON object with:
- main_field (string)
- overview (string)
- scorecards (array of: course_name, AI_proof_score, risk_level, growth_potential, time_horizon, key_reason, safe_skills)
- recommendation (string)`;

      const response = await invokeLLM({ 
        prompt: prompt,
        query: prompt
      });

      console.log('[FutureScore] Raw response:', response);

      let parsedData = null;
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[FutureScore] JSON parse error:', e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      const scoreData = {
        main_field: parsedData?.main_field || q,
        overview: parsedData?.overview || "Analysis of future-proof potential for this career path.",
        scorecards: parsedData?.scorecards || [],
        recommendation: parsedData?.recommendation || "Continue developing skills that complement AI rather than compete with it."
      };

      console.log('[FutureScore] Parsed:', scoreData);
      setResults(scoreData);

    } catch (err) {
      console.error('[FutureScore] Error:', err);
      setError(err.message || 'Failed to analyze future-proof score. Please try again.');
    } finally { 
      setLoading(false); 
    }
  };

  const sorted = results?.scorecards ? [...results.scorecards].sort((a, b) =>
    sortBy === "score" ? (b.AI_proof_score || 0) - (a.AI_proof_score || 0) : (a.risk_level || "").localeCompare(b.risk_level || "")
  ) : [];

  const riskConfig = {
    Low: { color: "text-green-600", bg: "bg-green-50", bar: "bg-green-500" },
    Medium: { color: "text-amber-600", bg: "bg-amber-50", bar: "bg-amber-500" },
    High: { color: "text-red-600", bg: "bg-red-50", bar: "bg-red-500" },
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="AI Future-Proof Score" subtitle="See how AI will impact any career — and how to stay ahead" icon={Shield} />

      {/* Search */}
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

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && <LoadingGrid text="Scoring with AI trend analysis..." />}

      {!loading && results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {results.overview && (
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-5">
              <p className="font-heading font-bold text-lg">{results.main_field || query}</p>
              <p className="text-sm text-muted-foreground mt-1">{results.overview}</p>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Sort by:</span>
            {["score", "risk"].map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${sortBy === s ? "bg-foreground text-background" : "bg-secondary"}`}>
                {s === "score" ? "Highest Score" : "Lowest Risk"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {sorted.map((card, i) => {
              const cfg = riskConfig[card.risk_level] || riskConfig.Medium;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-heading font-bold text-base">{card.course_name || "Career"}</h3>
                      {card.key_reason && <p className="text-xs text-muted-foreground mt-0.5">{card.key_reason}</p>}
                    </div>
                    <div className="text-center shrink-0">
                      <div className={`h-12 w-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                        <span className={`text-lg font-bold ${cfg.color}`}>{card.AI_proof_score || 5}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">/10</p>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div className={`h-full ${cfg.bar} rounded-full`} initial={{ width: 0 }} animate={{ width: `${((card.AI_proof_score || 5) / 10) * 100}%` }} transition={{ duration: 0.8 }} />
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium ${cfg.bg} ${cfg.color}`}>
                      <AlertTriangle className="h-3 w-3" /> {card.risk_level || "Medium"} Risk
                    </span>
                    {card.growth_potential && <span className="flex items-center gap-1 bg-green-50 text-green-600 px-2.5 py-1 rounded-md font-medium"><TrendingUp className="h-3 w-3" /> {card.growth_potential} growth</span>}
                    {card.time_horizon && <span className="flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-md"><Zap className="h-3 w-3" /> {card.time_horizon}</span>}
                  </div>

                  {card.safe_skills && card.safe_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Human-proof skills:</span>
                      {card.safe_skills.map((s, j) => <span key={j} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md">{s}</span>)}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {results.recommendation && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
              <p className="text-sm font-medium text-accent">💡 Recommendation</p>
              <p className="text-sm text-muted-foreground mt-1">{results.recommendation}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}