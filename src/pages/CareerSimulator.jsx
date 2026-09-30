import { useState } from "react";
import { Cpu, Plus, X, Loader2, TrendingUp, DollarSign, Zap, Shield } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { invokeLLM } from "@/api/llm";
import { parseAIResponse } from "@/lib/aiResponseHandler";
import SectionHeader from "../components/SectionHeader";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

export default function CareerSimulator() {
  const { deductCredit } = useCredits();
  const [degree, setDegree] = useState("");
  const [internships, setInternships] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [internInput, setInternInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [result, setResult] = useState(null);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addItem = (val, list, setList, setInput) => {
    if (!val.trim() || list.includes(val.trim())) return;
    setList([...list, val.trim()]);
    setInput("");
  };

  const simulate = async () => {
    if (!degree.trim()) return;

    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setResult(null);
    setMarkdownFallback("");
    setError(null);

    try {
      const prompt = `Simulate a detailed 5-10 year career outlook for a student with:
Degree: ${degree}
Internships/Experience: ${internships.join(", ") || "None"}
Certifications: ${certifications.join(", ") || "None"}

Return a JSON object with:
- path_id, degree
- predicted_salary_year1, predicted_salary_year5, predicted_salary_year10
- AI_risk_score (0-100), AI_risk_level, future_proof_score (1-10)
- job_opportunities_year1, job_opportunities_year5
- top_roles (array), key_milestones (array with years)
- growth_potential (string + explanation)
- best_locations (array), skills_to_accelerate (array)
- warnings (array), overall_verdict

RULES: NEVER say "varies". Use real numbers and specific names. Be brutally honest about risks.

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences. Start with { and end with }.`;

      const response = await invokeLLM({ prompt: prompt, query: prompt });
      console.log('[CareerSimulator] Raw response:', response);

      const parsed = parseAIResponse(response);
      console.log('[CareerSimulator] Parsed type:', parsed.type);

      if (parsed.type === 'json' && parsed.data) {
        const d = parsed.data;
        const simResult = {
          degree: d.degree || degree,
          predicted_salary_year1: d.predicted_salary_year1 || "",
          predicted_salary_year5: d.predicted_salary_year5 || "",
          predicted_salary_year10: d.predicted_salary_year10 || "",
          AI_risk_level: d.AI_risk_level || "",
          future_proof_score: d.future_proof_score || "",
          overall_verdict: d.overall_verdict || "",
          key_milestones: d.key_milestones || [],
          top_roles: d.top_roles || [],
          skills_to_accelerate: d.skills_to_accelerate || [],
          warnings: d.warnings || [],
          growth_potential: d.growth_potential || "",
          best_locations: d.best_locations || [],
        };
        setResult(simResult);
      } else if (parsed.type === 'markdown') {
        setMarkdownFallback(parsed.raw);
      } else {
        setError('No simulation data returned. Please try again.');
      }
    } catch (error) {
      console.error('[CareerSimulator] Error:', error);
      setError(error.message || 'Failed to simulate career. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="Career Simulator" subtitle="Simulate your 5–10 year career outlook based on your degree + experience" icon={Cpu} />

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Degree / Field</label>
          <input value={degree} onChange={e => setDegree(e.target.value)}
            placeholder="e.g., B.Tech Computer Science, MBBS, MBA Finance..."
            className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internships / Work Experience</label>
          <div className="flex gap-2 mt-1.5">
            <input value={internInput} onChange={e => setInternInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem(internInput, internships, setInternships, setInternInput)}
              placeholder="e.g., Google SWE Intern, Hospital Shadowing..."
              className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={() => addItem(internInput, internships, setInternships, setInternInput)} className="px-3 bg-primary text-primary-foreground rounded-lg"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {internships.map((i, idx) => (
              <span key={idx} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                {i} <button onClick={() => setInternships(prev => prev.filter((_, j) => j !== idx))}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certifications</label>
          <div className="flex gap-2 mt-1.5">
            <input value={certInput} onChange={e => setCertInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem(certInput, certifications, setCertifications, setCertInput)}
              placeholder="e.g., AWS Cloud, CFA Level 1..."
              className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={() => addItem(certInput, certifications, setCertifications, setCertInput)} className="px-3 bg-primary text-primary-foreground rounded-lg"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {certifications.map((c, idx) => (
              <span key={idx} className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md">
                {c} <button onClick={() => setCertifications(prev => prev.filter((_, j) => j !== idx))}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>

        <button onClick={simulate} disabled={!degree.trim() || loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20 hover:opacity-90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
          Run Simulation
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && <LoadingGrid text="Simulating your career trajectory..." />}

      {!loading && result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-5">
            <p className="font-heading font-bold text-lg">{result.degree}</p>
            {result.overall_verdict && <p className="text-sm text-muted-foreground mt-1">{result.overall_verdict}</p>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Year 1 Salary", value: result.predicted_salary_year1, icon: DollarSign, color: "text-green-600" },
              { label: "Year 5 Salary", value: result.predicted_salary_year5, icon: TrendingUp, color: "text-blue-600" },
              { label: "Year 10 Salary", value: result.predicted_salary_year10, icon: TrendingUp, color: "text-indigo-600" },
              { label: "Future-proof", value: result.future_proof_score ? `${result.future_proof_score}/10` : null, icon: Shield, color: "text-purple-600" },
            ].filter(c => c.value).map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <c.icon className={`h-4 w-4 ${c.color}`} />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2">{c.label}</p>
                <p className={`font-heading font-bold text-sm mt-0.5 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {result.key_milestones?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold mb-3">📅 Career Milestones</h3>
              <div className="space-y-2">
                {result.key_milestones.map((m, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-muted-foreground">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {result.top_roles?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-bold text-sm mb-2">🎯 Top Roles</h3>
                {result.top_roles.map((r, i) => <p key={i} className="text-sm text-muted-foreground">• {r}</p>)}
              </div>
            )}
            {result.skills_to_accelerate?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-bold text-sm mb-2">⚡ Skills to Accelerate Growth</h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.skills_to_accelerate.map((s, i) => <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-md">{s}</span>)}
                </div>
              </div>
            )}
          </div>

          {result.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-heading font-bold text-amber-700 text-sm mb-2">⚠️ Heads Up</h3>
              {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-700">• {w}</p>)}
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