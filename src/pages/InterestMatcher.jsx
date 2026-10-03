import { useState, useRef } from "react";
import { Sparkles, X, Plus, Loader2, ChevronRight } from "lucide-react";
import { invokeLLMStream } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import SectionHeader from "../components/SectionHeader";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

const SUGGESTIONS = [
  "Drawing", "Coding", "Cooking", "Photography", "Writing", "Music", "Dancing",
  "Gaming", "Reading", "Sports", "Traveling", "Animals", "Science experiments",
  "Building things", "Social media", "Teaching", "Volunteering", "Puzzles",
  "Nature", "Math", "History", "Languages", "Debating", "Gardening", "Astronomy",
  "Film making", "3D modeling", "Yoga", "Swimming", "Chess"
];

export default function InterestMatcher() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const addInterest = (interest) => {
    if (interest && !interests.includes(interest) && interests.length < 10) {
      setInterests([...interests, interest]);
    }
    setInputVal("");
  };

  const removeInterest = (interest) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const findMatches = async () => {
    if (interests.length === 0) return;

    const ok = await deductCredit();
    if (!ok) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setStreamedText("");
    setParsedItems([]);
    setError(null);

    const prompt = `You are Collade AI, an expert career intelligence assistant.

A student has these interests/hobbies: ${interests.join(", ")}.

Write a HIGHLY DETAILED personalized career analysis, then list 12 matched careers.

=== PART 1: PERSONALIZED ANALYSIS ===

Write 3-4 paragraphs covering:
- What these interests reveal about the student's personality and work style
- Which industries and role types align with this profile
- Creative combinations they might not have considered
- How these interests translate to real-world careers in 2025-2030

Then 6-8 "Personalized Insights" bullets with specific observations tied to THEIR interests.

Then 5 "Unique Career Angles" bullets — unconventional paths worth exploring.

Then 4-5 "Skills to Build" bullets tied to their interests.

=== PART 2: MATCHED CAREERS ===

After the guide, write EXACTLY this marker on its own line:

[ CAREER CARDS ]

Then list 12 careers matched to these interests, EACH in this EXACT format:

Career Name Here
Stream: Specific field
Duration: X years · Level: Undergraduate/Postgraduate/Certification
Salary: ₹X-Y LPA (India) | $X-Y USD (Global)
AI Impact: Low/Medium/High · Growth: High/Medium
[2-3 sentence description explaining why THIS career fits someone with these interests]

(blank line between each career)

RULES:
- Reference their actual interests in descriptions
- Mix mainstream + niche + emerging paths
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
          console.error('[InterestMatcher] Error:', err);
          setError(err.message || 'Failed to find career matches. Please try again.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[InterestMatcher] Catch error:', err);
      setError(err.message || 'Failed to find career matches.');
      setLoading(false);
    }
  };

  const openCareerDetail = (careerName) => {
    navigate(`/career-detail?name=${encodeURIComponent(careerName)}&stream=${encodeURIComponent(interests.join(", "))}`);
  };

  const guideText = streamedText.split("[ CAREER CARDS ]")[0] || "";
  const showForm = !streamedText;

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader
        title="Interest Matcher"
        subtitle="Add your interests and hobbies — AI will find your perfect career matches"
        icon={Sparkles}
      />

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addInterest(inputVal.trim());
              }}
              placeholder="Type an interest or hobby and press Enter..."
              className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => addInterest(inputVal.trim())}
              className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence>
            {interests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex flex-wrap gap-2"
              >
                {interests.map((interest) => (
                  <motion.span
                    key={interest}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {interest}
                    <button onClick={() => removeInterest(interest)} className="hover:bg-primary/20 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.filter((s) => !interests.includes(s)).slice(0, 15).map((s) => (
                <button
                  key={s}
                  onClick={() => addInterest(s)}
                  className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={findMatches}
            disabled={interests.length === 0 || loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-opacity shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Find My Career Matches ({interests.length} interest{interests.length !== 1 ? "s" : ""})
          </button>
        </div>
      )}

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
            <p className="font-heading font-semibold text-primary">✨ Analyzing your interests...</p>
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
              🎯 {parsedItems.length} careers matched to your interests
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
          <button
            onClick={() => {
              setStreamedText("");
              setParsedItems([]);
              setInterests([]);
              setError(null);
            }}
            className="text-sm text-primary font-medium hover:underline"
          >
            ← Start over
          </button>
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