import { useState } from "react";
import { GitCompare, Search, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { invokeLLM } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import { parseAIResponse } from "@/lib/aiResponseHandler";
import FeatureGate from "../components/FeatureGate";
import SectionHeader from "../components/SectionHeader";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

export default function Compare() {
  const { deductCredit } = useCredits();
  const [course1, setCourse1] = useState("");
  const [course2, setCourse2] = useState("");
  const [result, setResult] = useState(null);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const compareNow = async () => {
    if (!course1.trim() || !course2.trim()) return;

    const ok = await deductCredit();
    if (!ok) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setResult(null);
    setMarkdownFallback("");
    setError(null);

    try {
      const prompt = `Compare these two career paths side by side:

Career 1: "${course1}"
Career 2: "${course2}"

You MUST return a structured JSON object with these EXACT fields with specific, real data:

- course_1: { name, level, duration, description, salary_india, salary_global, ai_impact, growth_potential, stress_level, personality_fit, top_universities (array), required_skills (array), entrance_exams (array), future_proof_score, pros (array), cons (array) }
- course_2: Same structure
- verdict: 2-3 sentences
- who_should_choose_1: 1-2 sentences
- who_should_choose_2: 1-2 sentences

RULES: NEVER say "varies". ALWAYS use real numbers and specific names. Be balanced.

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences. Start with { and end with }.`;

      const response = await invokeLLM({ prompt, query: prompt });
      console.log('[Compare] Raw response:', response);

      const parsed = parseAIResponse(response);
      console.log('[Compare] Parsed type:', parsed.type);

      if (parsed.type === 'json' && parsed.data?.course_1) {
        const compareData = {
          course_1: parsed.data.course_1,
          course_2: parsed.data.course_2 || parsed.data.course_1,
          verdict: parsed.data.verdict || "",
          who_should_choose_1: parsed.data.who_should_choose_1 || "",
          who_should_choose_2: parsed.data.who_should_choose_2 || "",
        };
        console.log('[Compare] Parsed data:', compareData);
        setResult(compareData);
      } else if (parsed.type === 'markdown') {
        setMarkdownFallback(parsed.raw);
      } else {
        setError('No comparison data returned. Please try again.');
      }
    } catch (error) {
      console.error('[Compare] Error:', error);
      setError(error.message || 'Failed to compare careers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ComparisonColumn = ({ data, color }) => (
    <div className="space-y-4">
      <h3 className={`font-heading font-bold text-lg ${color}`}>{data.name}</h3>
      {data.description && <p className="text-sm text-muted-foreground">{data.description}</p>}

      <div className="space-y-2">
        {[
          ["Level", data.level],
          ["Duration", data.duration],
          ["Salary (India)", data.salary_india],
          ["Salary (Global)", data.salary_global],
          ["AI Impact", data.ai_impact],
          ["Growth Potential", data.growth_potential],
          ["Stress Level", data.stress_level],
          ["Personality Fit", data.personality_fit],
          ["Future-proof Score", data.future_proof_score],
        ].filter(([_, v]) => v).map(([label, value]) => (
          <div key={label} className="flex justify-between items-start text-sm py-1.5 border-b border-border/50">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className="font-medium text-right max-w-[60%]">{value}</span>
          </div>
        ))}
      </div>

      {data.top_universities?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Top Universities</p>
          <div className="flex flex-wrap gap-1">
            {data.top_universities.map((u, i) => (
              <span key={i} className="text-[11px] bg-secondary px-2 py-1 rounded-md">{u}</span>
            ))}
          </div>
        </div>
      )}

      {data.required_skills?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Required Skills</p>
          <div className="flex flex-wrap gap-1">
            {data.required_skills.map((s, i) => (
              <span key={i} className="text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-md">{s}</span>
            ))}
          </div>
        </div>
      )}

      {data.pros?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-600 mb-1">✅ Pros</p>
          <ul className="space-y-1">
            {data.pros.map((p, i) => <li key={i} className="text-xs text-muted-foreground">• {p}</li>)}
          </ul>
        </div>
      )}

      {data.cons?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-500 mb-1">⚠️ Cons</p>
          <ul className="space-y-1">
            {data.cons.map((c, i) => <li key={i} className="text-xs text-muted-foreground">• {c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader
        title="Compare Careers"
        subtitle="Put two degrees or careers side by side"
        icon={GitCompare}
      />

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course / Career 1</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={course1}
                onChange={(e) => setCourse1(e.target.value)}
                placeholder="e.g., Computer Science"
                className="w-full bg-secondary rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course / Career 2</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={course2}
                onChange={(e) => setCourse2(e.target.value)}
                placeholder="e.g., Data Science"
                className="w-full bg-secondary rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
        <button
          onClick={compareNow}
          disabled={!course1.trim() || !course2.trim() || loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
          Compare Now
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && <LoadingGrid text="Comparing careers..." />}

      {!loading && result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <ComparisonColumn data={result.course_1} color="text-primary" />
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <ComparisonColumn data={result.course_2} color="text-accent" />
            </div>
          </div>

          {result.verdict && (
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-5 space-y-3">
              <h3 className="font-heading font-bold text-lg">🏆 Verdict</h3>
              <p className="text-sm text-muted-foreground">{result.verdict}</p>
              {result.who_should_choose_1 && (
                <p className="text-sm"><span className="font-semibold text-primary">Choose {result.course_1?.name} if:</span> <span className="text-muted-foreground">{result.who_should_choose_1}</span></p>
              )}
              {result.who_should_choose_2 && (
                <p className="text-sm"><span className="font-semibold text-accent">Choose {result.course_2?.name} if:</span> <span className="text-muted-foreground">{result.who_should_choose_2}</span></p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {!loading && markdownFallback && !result && (
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