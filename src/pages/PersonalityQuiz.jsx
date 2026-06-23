import { useState } from "react";
import { Smile, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { invokeLLM } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import CareerCard from "../components/CareerCard";
import LoadingGrid from "../components/LoadingGrid";
import { motion, AnimatePresence } from "framer-motion";

const QUESTIONS = [
  {
    q: "After a big group project, you feel...",
    options: [
      { label: "⚡ Energized! I love collaborating", value: "extrovert" },
      { label: "😌 Drained — I need alone time to recharge", value: "introvert" }
    ]
  },
  {
    q: "You'd rather spend a Saturday...",
    options: [
      { label: "🎨 Making something creative — art, music, writing", value: "creative" },
      { label: "📊 Solving puzzles, coding, or analyzing data", value: "analytical" }
    ]
  },
  {
    q: "Your dream job has...",
    options: [
      { label: "🚀 High risk, high reward — startup / entrepreneurship", value: "risk_taker" },
      { label: "🏛️ Stability, good salary, and clear growth path", value: "stable" }
    ]
  },
  {
    q: "You prefer learning by...",
    options: [
      { label: "🙌 Doing — hands-on projects and experiments", value: "hands_on" },
      { label: "📚 Reading and understanding theory first", value: "theoretical" }
    ]
  },
  {
    q: "In a team, you naturally become...",
    options: [
      { label: "👑 The leader who drives direction", value: "leader" },
      { label: "🔧 The specialist who does deep work", value: "specialist" }
    ]
  },
  {
    q: "You're most excited by...",
    options: [
      { label: "🌍 Changing the world / social impact", value: "impact" },
      { label: "💰 Building wealth and financial freedom", value: "wealth" }
    ]
  }
];

export default function PersonalityQuiz() {
  const { deductCredit } = useCredits();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [error, setError] = useState(null);

  const answer = (val) => {
    const newAnswers = { ...answers, [currentQ]: val };
    setAnswers(newAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 300);
    }
  };

  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  const analyze = async () => {
    const spent = await deductCredit();
    if (!spent) { 
      window.dispatchEvent(new CustomEvent("collade:upgrade")); 
      return; 
    }
    
    setLoading(true);
    setError(null);
    
    const profile = QUESTIONS.map((q, i) => `${q.q} → ${q.options.find(o => o.value === answers[i])?.label || answers[i]}`).join("\n");
    
    try {
      const prompt = `Based on this personality quiz for a high school/college student, determine their personality type and give career recommendations:

Quiz Answers:
${profile}

Give a fun, encouraging, and detailed personality analysis with tailored career and course suggestions.

Return a JSON object with:
- personality_type (string)
- personality_emoji (string)
- personality_description (string)
- strengths (array)
- growth_areas (array)
- work_style (string)
- famous_examples (array)
- recommended_courses (array of: name, stream, level, duration, short_description, salary_range, ai_impact, growth, locations)
- recommended_careers (array)
- avoid_these (array)
- motivational_message (string)`;

      const response = await invokeLLM({ 
        prompt: prompt,
        query: prompt
      });

      console.log('[PersonalityQuiz] Raw response:', response);

      let parsedData = null;
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[PersonalityQuiz] JSON parse error:', e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      const personalityResult = {
        personality_type: parsedData?.personality_type || "Creative Thinker",
        personality_emoji: parsedData?.personality_emoji || "✨",
        personality_description: parsedData?.personality_description || "You have a unique blend of creativity and analytical thinking.",
        strengths: parsedData?.strengths || ["Curiosity", "Adaptability", "Problem solving"],
        growth_areas: parsedData?.growth_areas || ["Focus", "Time management", "Public speaking"],
        work_style: parsedData?.work_style || "You thrive in collaborative environments with clear goals.",
        famous_examples: parsedData?.famous_examples || ["Innovative thinkers", "Creative problem solvers"],
        recommended_courses: parsedData?.recommended_courses || [],
        recommended_careers: parsedData?.recommended_careers || ["Creative careers", "Technology roles", "Business opportunities"],
        avoid_these: parsedData?.avoid_these || [],
        motivational_message: parsedData?.motivational_message || "Your unique combination of skills will take you far!"
      };

      console.log('[PersonalityQuiz] Parsed:', personalityResult);
      setResult(personalityResult);

    } catch (err) {
      console.error('[PersonalityQuiz] Error:', err);
      setError(err.message || 'Failed to analyze personality. Please try again.');
    } finally { 
      setLoading(false); 
    }
  };

  const reset = () => { setAnswers({}); setResult(null); setCurrentQ(0); setError(null); };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="Personality Analyzer" subtitle="A fun 6-question quiz to discover careers that fit YOU" icon={Smile} />

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!result && !loading && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex gap-1.5">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${answers[i] ? "bg-primary" : i === currentQ ? "bg-primary/40" : "bg-secondary"}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Question {currentQ + 1} of {QUESTIONS.length}</p>
              <h3 className="font-heading font-bold text-lg">{QUESTIONS[currentQ].q}</h3>
              <div className="space-y-2">
                {QUESTIONS[currentQ].options.map(opt => (
                  <button key={opt.value} onClick={() => answer(opt.value)}
                    className={`w-full text-left p-4 rounded-xl text-sm font-medium transition-all border ${answers[currentQ] === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30 hover:bg-secondary"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30">← Previous</button>
                {currentQ < QUESTIONS.length - 1 ? (
                  <button onClick={() => setCurrentQ(currentQ + 1)} disabled={!answers[currentQ]}
                    className="text-sm font-medium text-primary flex items-center gap-1 disabled:opacity-30">
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={analyze} disabled={!allAnswered}
                    className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 shadow-lg shadow-primary/20">
                    <Smile className="h-4 w-4" /> See My Results
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="text-xs text-center text-muted-foreground">Answer all 6 questions to unlock your personality profile!</p>
        </div>
      )}

      {loading && <LoadingGrid text="Analyzing your unique personality..." />}

      {!loading && result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <button onClick={reset} className="text-sm text-primary font-medium hover:underline">← Retake Quiz</button>

          {/* Personality type card */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center">
            <p className="text-5xl mb-3">{result.personality_emoji || "✨"}</p>
            <h2 className="font-heading text-2xl font-bold">{result.personality_type || "Creative Thinker"}</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{result.personality_description || "You have a unique blend of creativity and analytical thinking."}</p>
            {result.motivational_message && (
              <p className="mt-4 text-sm font-medium text-primary bg-primary/10 rounded-xl px-4 py-2">{result.motivational_message}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {result.strengths && result.strengths.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">✅ Your Strengths</p>
                {result.strengths.map((s, i) => <p key={i} className="text-sm text-muted-foreground">• {s}</p>)}
              </div>
            )}
            {result.growth_areas && result.growth_areas.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">🌱 Growth Areas</p>
                {result.growth_areas.map((s, i) => <p key={i} className="text-sm text-muted-foreground">• {s}</p>)}
              </div>
            )}
          </div>

          {result.work_style && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your Work Style</p>
              <p className="text-sm">{result.work_style}</p>
            </div>
          )}

          {result.famous_examples && result.famous_examples.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Famous people with your type</p>
              <div className="flex flex-wrap gap-1.5">
                {result.famous_examples.map((e, i) => <span key={i} className="text-xs bg-secondary px-3 py-1.5 rounded-lg">{e}</span>)}
              </div>
            </div>
          )}

          {result.recommended_courses && result.recommended_courses.length > 0 && (
            <div>
              <h3 className="font-heading font-bold text-lg mb-3">🎯 Recommended Paths For You</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.recommended_courses.map((c, i) => <CareerCard key={i} career={c} index={i} />)}
              </div>
            </div>
          )}

          {result.recommended_careers && result.recommended_careers.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">🌟 Recommended Careers</p>
              <div className="flex flex-wrap gap-1.5">
                {result.recommended_careers.map((c, i) => <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md">{c}</span>)}
              </div>
            </div>
          )}

          {result.avoid_these && result.avoid_these.length > 0 && (
            <div className="bg-secondary rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">⚠️ Careers to Think Twice About</p>
              <div className="flex flex-wrap gap-1.5">
                {result.avoid_these.map((e, i) => <span key={i} className="text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-md">{e}</span>)}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}