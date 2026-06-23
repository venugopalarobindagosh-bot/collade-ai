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
      const prompt = `Compare these two career paths / degrees side by side:

Course/Career 1: "${course1}"
Course/Career 2: "${course2}"

Provide a detailed, balanced comparison covering ALL aspects. Be honest about pros and cons of each. Help a student decide which might be better for them.

Return a JSON object with:
- course_1: { name, level, duration, description, salary_india, salary_global, ai_impact, growth_potential, stress_level, personality_fit, top_universities (array), required_skills (array), entrance_exams (array), future_proof_score, pros (array), cons (array) }
- course_2: same structure as course_1
- verdict: string
- who_should_choose_1: string
- who_should_choose_2: string`;

      const response = await invokeLLM({ 
        prompt: prompt,
        query: prompt
      });

      console.log('[Compare] Raw response:', response);

      // Parse the response
      let parsedData = null;
      
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[Compare] JSON parse error:', e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      // Build comparison object with fallbacks
      const compareData = {
        course_1: {
          name: parsedData?.course_1?.name || course1,
          level: parsedData?.course_1?.level || "Varies",
          duration: parsedData?.course_1?.duration || "Varies",
          description: parsedData?.course_1?.description || "Learn more about this career path",
          salary_india: parsedData?.course_1?.salary_india || "Varies",
          salary_global: parsedData?.course_1?.salary_global || "Varies",
          ai_impact: parsedData?.course_1?.ai_impact || "Medium",
          growth_potential: parsedData?.course_1?.growth_potential || "Stable",
          stress_level: parsedData?.course_1?.stress_level || "Moderate",
          personality_fit: parsedData?.course_1?.personality_fit || "Varies by individual",
          top_universities: parsedData?.course_1?.top_universities || [],
          required_skills: parsedData?.course_1?.required_skills || [],
          entrance_exams: parsedData?.course_1?.entrance_exams || [],
          future_proof_score: parsedData?.course_1?.future_proof_score || "Good",
          pros: parsedData?.course_1?.pros || ["Good career prospects"],
          cons: parsedData?.course_1?.cons || ["May require additional study"],
        },
        course_2: {
          name: parsedData?.course_2?.name || course2,
          level: parsedData?.course_2?.level || "Varies",
          duration: parsedData?.course_2?.duration || "Varies",
          description: parsedData?.course_2?.description || "Learn more about this career path",
          salary_india: parsedData?.course_2?.salary_india || "Varies",
          salary_global: parsedData?.course_2?.salary_global || "Varies",
          ai_impact: parsedData?.course_2?.ai_impact || "Medium",
          growth_potential: parsedData?.course_2?.growth_potential || "Stable",
          stress_level: parsedData?.course_2?.stress_level || "Moderate",
          personality_fit: parsedData?.course_2?.personality_fit || "Varies by individual",
          top_universities: parsedData?.course_2?.top_universities || [],
          required_skills: parsedData?.course_2?.required_skills || [],
          entrance_exams: parsedData?.course_2?.entrance_exams || [],
          future_proof_score: parsedData?.course_2?.future_proof_score || "Good",
          pros: parsedData?.course_2?.pros || ["Good career prospects"],
          cons: parsedData?.course_2?.cons || ["May require additional study"],
        },
        verdict: parsedData?.verdict || "Both careers have their strengths. Choose based on your interests and goals.",
        who_should_choose_1: parsedData?.who_should_choose_1 || "Those passionate about this field",
        who_should_choose_2: parsedData?.who_should_choose_2 || "Those passionate about this field"
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

      {/* Input */}
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

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && <LoadingGrid text="Comparing careers..." />}

      {!loading && result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Side by side */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <ComparisonColumn data={result.course_1} color="text-primary" />
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <ComparisonColumn data={result.course_2} color="text-accent" />
            </div>
          </div>

          {/* Verdict */}
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