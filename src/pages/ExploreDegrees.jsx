import { useState, useRef } from "react";
import { GraduationCap, Search, Loader2, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const LEVELS = ["Undergraduate", "Postgraduate", "Doctorate", "Diploma", "Professional Certification"];

const STREAMS = [
  "Science & Technology", "Commerce & Business", "Arts & Humanities", "Engineering",
  "Medicine & Health", "Law", "Design & Architecture", "Education",
  "Agriculture & Environment", "Media & Communication", "Social Sciences", "Performing Arts"
];

export default function ExploreDegrees() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const fetchDegrees = async (level, stream) => {
    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setStreamedText("");
    setParsedItems([]);
    setError(null);

    const prompt = `You are Collade AI, an expert career intelligence assistant.

List 8 diverse degrees/programs at the ${level} level in the "${stream}" stream.

FORMAT EXACTLY LIKE THIS — use ## for each degree:

# ${level} Degrees in ${stream}

## [Degree Name 1]
- **Level:** ${level} · **Duration:** X years
- **Salary:** ₹X-Y LPA (India) | $X-Y (Global)
- **AI Impact:** Low/Medium/High · **Growth:** High
- **Top Universities:** [3 real names]
[2-3 sentence description]

## [Degree Name 2]
(same format)

(repeat for 8 degrees — mix mainstream + niche + emerging)

RULES:
- REAL universities, REAL salaries with currency
- NEVER say "varies"
- Each description 2-3 sentences
- Keep under 700 words
- NO JSON, NO code blocks`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          const items = extractDegreesFromMarkdown(buffer);
          if (items.length > 0) setParsedItems(items);
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        },
        onDone: () => setLoading(false),
        onError: (err) => {
          console.error('[ExploreDegrees] Error:', err);
          setError(err.message || 'Failed to find degrees. Please try again.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[ExploreDegrees] Catch error:', err);
      setError(err.message || 'Failed to find degrees.');
      setLoading(false);
    }
  };

  const handleStreamClick = (stream) => {
    setSelectedStream(stream);
    setError(null);
    if (selectedLevel) fetchDegrees(selectedLevel, stream);
  };

  const handleLevelClick = (level) => {
    setSelectedLevel(level);
    setError(null);
    if (selectedStream) fetchDegrees(level, selectedStream);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }
    setSelectedLevel(null);
    setSelectedStream(null);
    setLoading(true);
    setStreamedText("");
    setParsedItems([]);
    setError(null);

    const prompt = `You are Collade AI, an expert career intelligence assistant.

List 8 degrees/programs related to: "${searchQuery}"

FORMAT EXACTLY LIKE THIS:

# Degrees Related to "${searchQuery}"

## [Degree Name 1]
- **Level:** Undergraduate/Postgraduate/etc · **Duration:** X years
- **Salary:** ₹X-Y LPA (India) | $X-Y (Global)
- **AI Impact:** Low/Medium/High · **Growth:** High
- **Top Universities:** [3 real names]
[2-3 sentence description]

## [Degree Name 2]
(same format)

(repeat for 8)

RULES:
- REAL universities, REAL salaries
- NEVER say "varies"
- Keep under 700 words
- NO JSON`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          const items = extractDegreesFromMarkdown(buffer);
          if (items.length > 0) setParsedItems(items);
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        },
        onDone: () => setLoading(false),
        onError: (err) => {
          setError(err.message || 'Search failed.');
          setLoading(false);
        },
      });
    } catch (err) {
      setError(err.message || 'Search failed.');
      setLoading(false);
    }
  };

  const openDegreeDetail = (degreeName) => {
    navigate(`/career-detail?name=${encodeURIComponent(degreeName)}&level=${encodeURIComponent(selectedLevel || "")}&stream=${encodeURIComponent(selectedStream || "")}`);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Explore by Degree"
        subtitle="Browse programs by level and stream — from diplomas to doctorates"
        icon={GraduationCap}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search any degree, e.g. 'Marine Biology', 'AI Engineering', 'Fashion Design'..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step 1 — Choose Level</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => handleLevelClick(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedLevel === level
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-foreground hover:border-primary/30"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step 2 — Choose Stream</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {STREAMS.map((stream) => (
            <button
              key={stream}
              onClick={() => handleStreamClick(stream)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                selectedStream === stream
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-foreground hover:border-primary/30"
              }`}
            >
              <span className="truncate">{stream}</span>
              <ChevronRight className="h-3 w-3 shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

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
            <p className="font-heading font-semibold text-primary">🎓 Finding degrees...</p>
          </div>
        </motion.div>
      )}

      {streamedText && loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-h-[50vh] overflow-y-auto"
          ref={scrollRef}
        >
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI is writing...</span>
          </div>
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-h1:text-xl prose-h1:mt-0 prose-h1:mb-3 prose-h1:text-primary
            prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-h2:text-foreground
            prose-p:text-muted-foreground prose-p:my-1.5 prose-p:leading-relaxed
            prose-li:text-muted-foreground prose-li:my-0.5
            prose-strong:text-foreground prose-strong:font-semibold
          ">
            <ReactMarkdown>{streamedText}</ReactMarkdown>
          </div>
        </motion.div>
      )}

      {parsedItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{parsedItems.length}</span>
              {loading && <span className="text-primary italic"> (streaming...)</span>}
              {" "}degrees found
            </p>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {parsedItems.map((degree, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => openDegreeDetail(degree.name)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors">{degree.name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                </div>
                <div className="space-y-1.5 text-xs">
                  {degree.duration && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Duration:</span> {degree.duration}</p>
                  )}
                  {degree.salary && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Salary:</span> {degree.salary}</p>
                  )}
                  {degree.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {degree.tags.map((tag, j) => (
                        <span key={j} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                  {degree.description && (
                    <p className="text-muted-foreground line-clamp-2 pt-1">{degree.description}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {!loading && streamedText && parsedItems.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-h1:text-2xl prose-h1:mt-0 prose-h1:mb-4 prose-h1:text-primary
            prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-primary prose-h2:border-b prose-h2:border-border prose-h2:pb-2
            prose-p:text-muted-foreground prose-p:my-2 prose-p:leading-relaxed
            prose-li:text-muted-foreground prose-li:my-1
            prose-strong:text-foreground prose-strong:font-semibold
          ">
            <ReactMarkdown>{streamedText}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function extractDegreesFromMarkdown(text) {
  if (!text || typeof text !== 'string') return [];
  const items = [];
  const sectionPattern = /^##\s+(.+?)$\n([\s\S]*?)(?=^##\s|^#\s|$)/gm;
  let match;
  while ((match = sectionPattern.exec(text)) !== null) {
    const name = match[1].trim();
    const body = match[2];
    if (!name || name.length > 100) continue;
    const salaryCheck = body.match(/\*\*Salary:\*\*/i);
    if (!salaryCheck) continue;

    const item = { name, duration: "", salary: "", tags: [], description: "" };
    const durationMatch = body.match(/\*\*Duration:\*\*\s*([^\n·|]+)/i);
    if (durationMatch) item.duration = durationMatch[1].trim().replace(/[·|].*/, '').trim();
    const salaryMatch = body.match(/\*\*Salary:\*\*\s*([^\n]+)/i);
    if (salaryMatch) item.salary = salaryMatch[1].trim();
    const levelMatch = body.match(/\*\*Level:\*\*\s*([^\n·|]+)/i);
    if (levelMatch) item.tags.push(levelMatch[1].trim().replace(/[·|].*/, '').trim());
    const aiMatch = body.match(/\*\*AI Impact:\*\*\s*([^\n·|]+)/i);
    if (aiMatch) item.tags.push("AI: " + aiMatch[1].trim().replace(/[·|].*/, '').trim());
    const growthMatch = body.match(/\*\*Growth:\*\*\s*([^\n·|]+)/i);
    if (growthMatch) item.tags.push("Growth: " + growthMatch[1].trim().replace(/[·|].*/, '').trim());
    const lines = body.split('\n').filter(l => l.trim());
    const descLine = [...lines].reverse().find(l => !l.trim().startsWith('-') && !l.trim().startsWith('*') && l.trim().length > 30);
    if (descLine) item.description = descLine.trim();
    items.push(item);
  }
  return items;
}