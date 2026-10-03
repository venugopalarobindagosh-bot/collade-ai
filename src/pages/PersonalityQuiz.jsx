import { useState, useRef } from "react";
import { Smile, ArrowRight, Loader2, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

const QUESTIONS = [
  {
    q: "After a big group project, you feel...",
    options: [
      { label: "⚡ Energized — I thrive on collaboration", value: "extrovert" },
      { label: "😌 Content — but I need alone time to recharge", value: "ambivert" },
      { label: "🔋 Drained — I prefer working solo", value: "introvert" },
      { label: "🎯 Focused — it depends on the team", value: "selective" },
      { label: "🌟 Inspired — the ideas got me excited", value: "idea_person" }
    ]
  },
  {
    q: "When faced with a hard problem, your instinct is to...",
    options: [
      { label: "🧩 Break it into smaller pieces", value: "analytical" },
      { label: "💡 Brainstorm creative alternatives", value: "creative" },
      { label: "📊 Gather data before deciding", value: "data_driven" },
      { label: "🗣️ Talk it through with someone", value: "collaborative" },
      { label: "⚡ Trust my gut and try things fast", value: "intuitive" }
    ]
  },
  {
    q: "Your dream work environment is...",
    options: [
      { label: "🚀 Fast-paced startup with high risk/reward", value: "startup" },
      { label: "🏛️ Stable company with clear career path", value: "corporate" },
      { label: "🎨 Creative studio or agency", value: "creative_env" },
      { label: "🌍 Remote, flexible, global team", value: "remote" },
      { label: "🔬 Research lab or specialized institution", value: "research" }
    ]
  },
  {
    q: "When you're learning something new, you prefer to...",
    options: [
      { label: "🙌 Dive in — figure it out hands-on", value: "hands_on" },
      { label: "📚 Read the theory first, then apply", value: "theoretical" },
      { label: "🎥 Watch videos or observe experts", value: "visual" },
      { label: "👥 Learn with a group or mentor", value: "social" },
      { label: "🧪 Experiment with a small project", value: "experimental" }
    ]
  },
  {
    q: "In a team, you naturally become...",
    options: [
      { label: "👑 The leader driving vision and decisions", value: "leader" },
      { label: "🔧 The specialist doing deep technical work", value: "specialist" },
      { label: "🌉 The bridge — connecting people and ideas", value: "connector" },
      { label: "⚡ The executor — turning plans into reality", value: "executor" },
      { label: "🎨 The creative voice — pushing the vision further", value: "creative_lead" }
    ]
  },
  {
    q: "What excites you most about work?",
    options: [
      { label: "🌍 Making real impact on people's lives", value: "impact" },
      { label: "💰 Building significant wealth and freedom", value: "wealth" },
      { label: "🏆 Recognition and status in your field", value: "recognition" },
      { label: "🧠 Solving intellectually hard problems", value: "intellectual" },
      { label: "🎨 Creative expression and building your own thing", value: "creative_expression" }
    ]
  },
  {
    q: "Your ideal 10-year future looks like...",
    options: [
      { label: "🏢 Leading a team at a big company", value: "exec_track" },
      { label: "🚀 Running your own startup or business", value: "entrepreneur" },
      { label: "🔬 Recognized expert in a specialized field", value: "expert_track" },
      { label: "🌱 Balanced life with fulfilling work", value: "balanced" },
      { label: "✈️ Traveling, freelancing, working globally", value: "location_free" }
    ]
  },
  {
    q: "How do you handle failure?",
    options: [
      { label: "🔥 Get back up immediately — failure fuels me", value: "resilient" },
      { label: "🤔 Reflect deeply and analyze what went wrong", value: "reflective" },
      { label: "🙋 Ask for feedback and adjust fast", value: "coachable" },
      { label: "😔 It hits hard — I need time to recover", value: "sensitive" },
      { label: "📈 Track patterns — I learn from every mistake", value: "systematic" }
    ]
  }
];

export default function PersonalityQuiz() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

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
    setStreamedText("");
    setParsedItems([]);

    const profile = QUESTIONS.map((q, i) => {
      const chosen = q.options.find(o => o.value === answers[i]);
      return `${q.q} → ${chosen?.label || answers[i]}`;
    }).join("\n");

    const prompt = `You are Collade AI, an expert personality and career analyst.

Analyze this student's personality based on their answers, then list 12 careers matched to them.

=== QUIZ ANSWERS ===
${profile}

=== PART 1: DETAILED ANALYSIS ===

Write a deep, insightful 4-5 paragraph analysis covering:
- Core personality type with a memorable name
- How they think and make decisions
- Their natural strengths and blind spots
- Ideal work environment and team role
- What drives them (money, impact, mastery, etc.)
- How they'll likely evolve over the next decade

Then 6-8 "Core Strengths" bullets tied to their specific answers.

Then 5 "Growth Areas to Work On" bullets.

Then 5 "Your Ideal Work Environment" bullets.

Then 4 "Famous People with Your Type" bullets — real successful people who share traits.

=== PART 2: MATCHED CAREERS ===

After the analysis, write EXACTLY this marker on its own line:

[ CAREER CARDS ]

Then list 12 careers matching this personality, EACH in this EXACT format (no #, no **, no bullets):

Career Name Here
Stream: Specific field
Duration: X years · Level: Undergraduate/Postgraduate/Certification
Salary: ₹X-Y LPA (India) | $X-Y USD (Global)
AI Impact: Low/Medium/High · Growth: High/Medium
[2-3 sentence description explaining WHY this career matches their specific personality type]

(blank line between each career)

RULES:
- Reference their actual quiz answers in descriptions
- REAL salaries with currency
- NEVER say "varies"
- Plain text format, no markdown symbols
- Use [ CAREER CARDS ] as the exact marker`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          if (buffer.includes("[ CAREER CARDS ]")) {
            const items = extractCareersFromMarker(buffer);
            if (items.length > 0) setParsedItems(items);
          }
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        },
        onDone: () => setLoading(false),
        onError: (err) => {
          console.error('[PersonalityQuiz] Error:', err);
          setError(err.message || 'Failed to analyze personality.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[PersonalityQuiz] Catch error:', err);
      setError(err.message || 'Failed to analyze personality.');
      setLoading(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setStreamedText("");
    setParsedItems([]);
    setCurrentQ(0);
    setError(null);
  };

  const openCareerDetail = (name) => {
    navigate(`/career-detail?name=${encodeURIComponent(name)}&stream=${encodeURIComponent("Personality Match")}`);
  };

  const guideText = streamedText.split("[ CAREER CARDS ]")[0] || "";
  const showQuiz = !streamedText && !loading;

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="Personality Analyzer" subtitle="8 deep questions to discover careers that fit YOU" icon={Smile} />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {showQuiz && (
        <div className="space-y-4">
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

          <p className="text-xs text-center text-muted-foreground">Answer all {QUESTIONS.length} questions to unlock your personality profile!</p>
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
            <p className="font-heading font-semibold text-primary">✨ Analyzing your personality...</p>
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
          {loading && !streamedText.includes("[ CAREER CARDS ]") && (
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
              🎯 {parsedItems.length} careers matched to your personality
              {loading && <span className="text-primary italic"> (streaming...)</span>}
            </p>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {parsedItems.map((career, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => openCareerDetail(career.name)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors">{career.name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                </div>
                <div className="space-y-1.5 text-xs">
                  {career.duration && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Duration:</span> {career.duration}</p>
                  )}
                  {career.salary && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Salary:</span> {career.salary}</p>
                  )}
                  {career.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {career.tags.map((tag, j) => (
                        <span key={j} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                  {career.description && (
                    <p className="text-muted-foreground line-clamp-2 pt-1">{career.description}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {streamedText && !loading && (
        <div className="text-center">
          <button onClick={reset} className="text-sm text-primary font-medium hover:underline">← Retake Quiz</button>
        </div>
      )}
    </div>
    </FeatureGate>
  );
}

function extractCareersFromMarker(text) {
  const markerIdx = text.indexOf("[ CAREER CARDS ]");
  if (markerIdx === -1) return [];
  const block = text.slice(markerIdx + "[ CAREER CARDS ]".length);
  const lines = block.split("\n").map(l => l.trim());
  const items = [];
  let current = null;
  let paragraphs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const isKey = /^(Stream|Duration|Salary|AI Impact|Level)\s*:/i.test(line);
    const isBullet = line.startsWith("-") || line.startsWith("•") || /^\d+\./.test(line);

    if (!isKey && !isBullet && line.length < 80 && !line.endsWith(".")) {
      if (current && (current.salary || current.duration)) {
        current.description = paragraphs.join(" ").trim();
        items.push(current);
      }
      current = { name: line, duration: "", salary: "", tags: [], description: "" };
      paragraphs = [];
      continue;
    }
    if (!current) continue;

    const streamMatch = line.match(/^Stream:\s*(.+)/i);
    if (streamMatch) { current.tags.push(streamMatch[1].trim()); continue; }

    const durationMatch = line.match(/^Duration:\s*([^·]+?)(?:\s*·\s*Level:\s*(.+))?$/i);
    if (durationMatch) {
      current.duration = durationMatch[1].trim();
      if (durationMatch[2]) current.tags.push(durationMatch[2].trim());
      continue;
    }
    const salaryMatch = line.match(/^Salary:\s*(.+)/i);
    if (salaryMatch) { current.salary = salaryMatch[1].trim(); continue; }

    const aiMatch = line.match(/^AI Impact:\s*([^·]+?)(?:\s*·\s*Growth:\s*(.+))?$/i);
    if (aiMatch) {
      current.tags.push("AI: " + aiMatch[1].trim());
      if (aiMatch[2]) current.tags.push("Growth: " + aiMatch[2].trim());
      continue;
    }
    paragraphs.push(line);
  }

  if (current && (current.salary || current.duration)) {
    current.description = paragraphs.join(" ").trim();
    items.push(current);
  }
  return items;
}