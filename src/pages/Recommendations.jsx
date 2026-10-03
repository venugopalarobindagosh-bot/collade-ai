import { useState, useRef } from "react";
import { Zap, ArrowRight, Sparkles, Loader2, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

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
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState([]);
  const [skills, setSkills] = useState([]);
  const [salary, setSalary] = useState("");
  const [dreamLocation, setDreamLocation] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const toggleItem = (item, list, setList) => {
    if (list.includes(item)) setList(list.filter((i) => i !== item));
    else setList([...list, item]);
  };

  const getRecommendations = async () => {
    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setStreamedText("");
    setParsedItems([]);
    setError(null);

    const salaryLabel = SALARY_OPTIONS.find(s => s.value === salary)?.label || salary;

    const prompt = `You are Collade AI, an expert career intelligence assistant.

Based on this student profile, write a HIGHLY DETAILED personalized analysis, then list 12 matched careers.

STUDENT PROFILE:
- Interests: ${interests.join(", ")}
- Strengths: ${skills.join(", ")}
- Salary expectation: ${salaryLabel}
- Dream location: ${dreamLocation || "Flexible / Global"}

=== PART 1: PERSONALIZED ANALYSIS ===

Write 3-4 paragraphs covering:
- What kind of thinker/worker this student is based on their profile
- Which industries and roles best suit this combination of interests + skills
- What salary path is realistic given their expectations
- What they should focus on next

Then 6-8 "Personalized Insights" bullets with specific observations about THEIR profile.

Then 5 "Skills to Develop" bullets.

Then 4-5 "Best Fit Industries" bullets.

=== PART 2: MATCHED CAREERS ===

After the guide, write EXACTLY this marker on its own line:

[ CAREER CARDS ]

Then list 12 careers matched to this profile, EACH in this EXACT format:

Career Name Here
Stream: Specific field
Duration: X years · Level: Undergraduate/Postgraduate/Certification
Salary: ₹X-Y LPA (India) | $X-Y USD (Global)
AI Impact: Low/Medium/High · Growth: High/Medium
[2-3 sentence description explaining why THIS career fits THIS profile]

(blank line between each career)

RULES:
- Reference their actual interests and skills in the descriptions
- REAL numbers with currency
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
          console.error('[Recommendations] Error:', err);
          setError(err.message || 'Failed to get recommendations.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[Recommendations] Catch error:', err);
      setError(err.message || 'Failed to get recommendations.');
      setLoading(false);
    }
  };

  const reset = () => {
    setStreamedText("");
    setParsedItems([]);
    setStep(1);
    setInterests([]);
    setSkills([]);
    setSalary("");
    setDreamLocation("");
    setError(null);
  };

  const openCareerDetail = (careerName) => {
    navigate(`/career-detail?name=${encodeURIComponent(careerName)}`);
  };

  const guideText = streamedText.split("[ CAREER CARDS ]")[0] || "";
  const showForm = !loading && !streamedText;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Recommendations"
        subtitle="Answer a few questions and get your personalized top career matches"
        icon={Zap}
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-secondary"}`} />
              </div>
            ))}
          </div>

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

      {loading && !streamedText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-heading font-semibold text-primary">🎯 Crafting your personalized recommendations...</p>
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
              🎯 {parsedItems.length} careers matched to your profile
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
          <button onClick={reset} className="text-sm text-primary font-medium hover:underline">
            ← Start over
          </button>
        </div>
      )}
    </div>
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