import { useState } from "react";
import { Zap, ArrowRight, Sparkles, Shield, TrendingUp, Target } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLM } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import CareerCard from "../components/CareerCard";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

const INTEREST_OPTIONS = [
  "Technology", "Science", "Arts", "Business", "Healthcare", "Education",
  "Environment", "Media", "Sports", "Music", "Gaming", "Design",
  "Law", "Psychology", "Writing", "Cooking", "Travel", "Social Work"
];

const SKILL_OPTIONS = [
  "Analytical thinking", "Creativity", "Communication", "Leadership",
  "Problem-solving", "Math/Numbers", "Coding", "Teamwork",
  "Public speaking", "Research", "Writing", "Design thinking"
];

const SALARY_OPTIONS = [
  { value: "modest", label: "₹3-8L / $30-60K", desc: "Modest but meaningful" },
  { value: "moderate", label: "₹8-20L / $60-100K", desc: "Comfortable living" },
  { value: "high", label: "₹20-50L / $100-200K", desc: "High earning" },
  { value: "premium", label: "₹50L+ / $200K+", desc: "Top tier" },
];

export default function Recommendations() {
  const { deductCredit } = useCredits();
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState([]);
  const [skills, setSkills] = useState([]);
  const [salary, setSalary] = useState("");
  const [dreamLocation, setDreamLocation] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleItem = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const getRecommendations = async () => {
    const spent = await deductCredit();
    if (!spent) { 
      window.dispatchEvent(new CustomEvent("collade:upgrade")); 
      return; 
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const prompt = `Based on this student profile, give the TOP 10 best career path recommendations:

Interests: ${interests.join(", ")}
Skills: ${skills.join(", ")}
Salary Expectation: ${salary}
Dream Location: ${dreamLocation || "Flexible / Global"}

For each recommendation, provide:
1. Why it's a perfect fit for this student
2. Future-proof potential (rate 1-10)
3. Risk vs reward assessment
4. Required skills they need to develop
5. Best education path to get there
6. Detailed career and salary info

Be creative — include both mainstream and unconventional paths. Think globally.

Return a JSON object with:
- recommendations (array of: name, stream, level, duration, short_description, why_it_fits, future_proof_score, risk_reward, salary_range, ai_impact, growth, locations, skills_to_develop, education_path)
- overall_insight (string)`;

      const response = await invokeLLM({
        prompt: prompt,
        query: prompt
      });

      console.log('[Recommendations] Raw response:', response);

      let parsedData = null;
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[Recommendations] JSON parse error:', e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      const recData = {
        recommendations: parsedData?.recommendations || [],
        overall_insight: parsedData?.overall_insight || "Based on your profile, here are the best career paths for you."
      };

      console.log('[Recommendations] Parsed:', recData);
      setResults(recData);

    } catch (err) {
      console.error('[Recommendations] Error:', err);
      setError(err.message || 'Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Recommendations"
        subtitle="Answer a few questions and get your personalized top career matches"
        icon={Zap}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !results && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-secondary"}`} />
              </div>
            ))}
          </div>

          {/* Step 1: Interests */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <h3 className="font-heading font-semibold text-lg">What are you interested in?</h3>
                <p className="text-sm text-muted-foreground">Select all that apply (at least 2)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleItem(interest, interests, setInterests)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      interests.includes(interest) ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={interests.length < 2}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <h3 className="font-heading font-semibold text-lg">What are your strengths?</h3>
                <p className="text-sm text-muted-foreground">Pick your top skills (at least 2)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleItem(skill, skills, setSkills)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      skills.includes(skill) ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm">
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={skills.length < 2}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Salary */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <h3 className="font-heading font-semibold text-lg">Salary expectations?</h3>
                <p className="text-sm text-muted-foreground">What level of earning do you aspire to?</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SALARY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSalary(opt.value)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      salary === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className={`text-xs mt-0.5 ${salary === opt.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm">
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!salary}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Location */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <h3 className="font-heading font-semibold text-lg">Dream location? (Optional)</h3>
                <p className="text-sm text-muted-foreground">Where would you love to study or work?</p>
              </div>
              <input
                value={dreamLocation}
                onChange={(e) => setDreamLocation(e.target.value)}
                placeholder="e.g., Tokyo, Silicon Valley, London, or leave blank for global"
                className="w-full bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm">
                  Back
                </button>
                <button
                  onClick={getRecommendations}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Sparkles className="h-4 w-4" /> Get My Matches
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {loading && <LoadingGrid text="AI is crafting your personalized recommendations..." />}

      {!loading && results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {results.overall_insight && (
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">AI Insight</p>
              </div>
              <p className="text-sm text-muted-foreground">{results.overall_insight}</p>
            </div>
          )}

          <button
            onClick={() => { setResults(null); setStep(1); setInterests([]); setSkills([]); setSalary(""); setDreamLocation(""); }}
            className="text-sm text-primary font-medium hover:underline"
          >
            ← Start over
          </button>

          <div className="space-y-4">
            {(results.recommendations || []).map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-md">#{i + 1}</span>
                  {rec.future_proof_score && (
                    <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Future-proof: {rec.future_proof_score}
                    </span>
                  )}
                </div>
                <CareerCard career={rec} index={i} />
                {rec.why_it_fits && (
                  <div className="pl-4 border-l-2 border-primary/30">
                    <p className="text-xs font-semibold text-primary">Why this fits you:</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{rec.why_it_fits}</p>
                  </div>
                )}
                {rec.risk_reward && (
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Risk vs Reward:</span> {rec.risk_reward}</p>
                )}
                {rec.education_path && (
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Education Path:</span> {rec.education_path}</p>
                )}
                {rec.skills_to_develop && rec.skills_to_develop.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rec.skills_to_develop.map((skill, j) => (
                      <span key={j} className="text-[11px] bg-secondary px-2 py-1 rounded-md">{skill}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}