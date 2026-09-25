import { useState } from "react";
import { GitCompare, Search, Loader2, ArrowRight } from "lucide-react";
import { invokeLLM } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import SectionHeader from "../components/SectionHeader";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

export default function Compare() {
  const { deductCredit } = useCredits();
  const [course1, setCourse1] = useState("");
  const [course2, setCourse2] = useState("");
  const [result, setResult] = useState(null);
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
    setError(null);

    try {
      const prompt = `Compare these two career paths side by side:

Career 1: "${course1}"
Career 2: "${course2}"

You MUST return a structured JSON object with these EXACT fields with specific, real data:

- course_1: {
    name: Full name,
    level: "Undergraduate" or "Postgraduate",
    duration: Specific years (e.g., "4 years"),
    description: 2-3 sentences describing the career,
    salary_india: Specific range (e.g., "₹6-12 LPA"),
    salary_global: Specific range (e.g., "$70,000-$110,000 USD"),
    ai_impact: Percentage (e.g., "25%"),
    growth_potential: "High", "Medium", or "Low",
    stress_level: "Low", "Medium", or "High",
    personality_fit: 1-2 sentences on who fits this career,
    top_universities: Array of 3-5 specific universities,
    required_skills: Array of 4-6 specific skills,
    entrance_exams: Array of 2-4 specific exams,
    future_proof_score: "High", "Medium", or "Low",
    pros: Array of 4-6 specific advantages,
    cons: Array of 4-6 specific disadvantages
  }
- course_2: Same structure as course_1
- verdict: 2-3 sentences giving a balanced verdict
- who_should_choose_1: 1-2 sentences on ideal candidate for career 1
- who_should_choose_2: 1-2 sentences on ideal candidate for career 2

RULES: NEVER say "varies". ALWAYS use real numbers and specific names. Be balanced and objective.`;

      const response = await invokeLLM({ prompt: prompt, query: prompt });
      console.log('[Compare] Raw response:', response);

      let parsedData = null;
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsedData = JSON.parse(jsonMatch[0]); } catch (e) { console.error('[Compare] JSON parse error:', e); }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      const compareData = {
        course_1: {
          name: parsedData?.course_1?.name || course1,
          level: parsedData?.course_1?.level || "Undergraduate",
          duration: parsedData?.course_1?.duration || "4 years",
          description: parsedData?.course_1?.description || "A rewarding career path with strong growth potential.",
          salary_india: parsedData?.course_1?.salary_india || "₹6-12 LPA",
          salary_global: parsedData?.course_1?.salary_global || "$70,000-$110,000 USD",
          ai_impact: parsedData?.course_1?.ai_impact || "25%",
          growth_potential: parsedData?.course_1?.growth_potential || "High",
          stress_level: parsedData?.course_1?.stress_level || "Medium",
          personality_fit: parsedData?.course_1?.personality_fit || "Analytical, detail-oriented, and communicative individuals",
          top_universities: parsedData?.course_1?.top_universities || ["IIT Bombay", "IIT Delhi", "BITS Pilani", "IISC Bangalore"],
          required_skills: parsedData?.course_1?.required_skills || ["Problem solving", "Communication", "Technical skills", "Critical thinking"],
          entrance_exams: parsedData?.course_1?.entrance_exams || ["JEE Main", "JEE Advanced", "BITSAT"],
          future_proof_score: parsedData?.course_1?.future_proof_score || "High",
          pros: parsedData?.course_1?.pros || ["Good salary", "Growth opportunities", "Work-life balance", "Global demand"],
          cons: parsedData?.course_1?.cons || ["Competitive", "Requires ongoing learning", "Can be stressful"],
        },
        course_2: {
          name: parsedData?.course_2?.name || course2,
          level: parsedData?.course_2?.level || "Undergraduate",
          duration: parsedData?.course_2?.duration || "4 years",
          description: parsedData?.course_2?.description || "A rewarding career path with strong growth potential.",
          salary_india: parsedData?.course_2?.salary_india || "₹6-12 LPA",
          salary_global: parsedData?.course_2?.salary_global || "$70,000-$110,000 USD",
          ai_impact: parsedData?.course_2?.ai_impact || "25%",
          growth_potential: parsedData?.course_2?.growth_potential || "High",
          stress_level: parsedData?.course_2?.stress_level || "Medium",
          personality_fit: parsedData?.course_2?.personality_fit || "Analytical, detail-oriented, and communicative individuals",
          top_universities: parsedData?.course_2?.top_universities || ["IIT Bombay", "IIT Delhi", "BITS Pilani", "IISC Bangalore"],
          required_skills: parsedData?.course_2?.required_skills || ["Problem solving", "Communication", "Technical skills", "Critical thinking"],
          entrance_exams: parsedData?.course_2?.entrance_exams || ["JEE Main", "JEE Advanced", "BITSAT"],
          future_proof_score: parsedData?.course_2?.future_proof_score || "High",
          pros: parsedData?.course_2?.pros || ["Good salary", "Growth opportunities", "Work-life balance", "Global demand"],
          cons: parsedData?.course_2?.cons || ["Competitive", "Requires ongoing learning", "Can be stressful"],
        },
        verdict: parsedData?.verdict || "Both careers have strong potential. Choose based on your personal interests, strengths, and career goals.",
        who_should_choose_1: parsedData?.who_should_choose_1 || "Those passionate about technology and innovation",
        who_should_choose_2: parsedData?.who_should_choose_2 || "Those passionate about problem-solving and impact"
      };

      console.log('[Compare] Parsed data:', compareData);
      setResult(compareData);

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

      {data.top_universities && data.top_universities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Top Universities</p>
          <div className="flex flex-wrap gap-1">
            {data.top_universities.map((u, i) => (
              <span key={i} className="text-[11px] bg-secondary px-2 py-1 rounded-md">{u}</span>
            ))}
          </div>
        </div>
      )}

      {data.required_skills && data.required_skills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Required Skills</p>
          <div className="flex flex-wrap gap-1">
            {data.required_skills.map((s, i) => (
              <span key={i} className="text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-md">{s}</span>
            ))}
          </div>
        </div>
      )}

      {data.pros && data.pros.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-600 mb-1">✅ Pros</p>
          <ul className="space-y-1">
            {data.pros.map((p, i) => <li key={i} className="text-xs text-muted-foreground">• {p}</li>)}
          </ul>
        </div>
      )}

      {data.cons && data.cons.length > 0 && (
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
    </div>
    </FeatureGate>
  );
}