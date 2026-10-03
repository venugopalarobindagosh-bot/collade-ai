import { useState, useRef } from "react";
import { GraduationCap, Search, Loader2, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

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

For ${level} degrees in the "${stream}" stream, write a HIGHLY DETAILED guide, then list 12 clickable degree cards.

=== PART 1: DETAILED GUIDE ===

Write 3-4 paragraphs covering:
- Overview of this stream and its career prospects in 2025-2030
- Key industry trends with real numbers
- Why this stream matters globally and in India
- AI disruption patterns

Then 5-7 "Key Insights" bullet points with real numbers.

Then "Top Locations" — best 5 cities/countries for this stream.

Then "How to Choose" — 5 concrete decision factors.

=== PART 2: DEGREE CARDS ===

After the guide, write EXACTLY this marker on its own line:

[ DEGREE CARDS ]

Then list 12 degrees, EACH in this EXACT format (no #, no **, no bullets):

Degree Name Here
Level: ${level} · Duration: X years
Salary: ₹X-Y LPA (India) | $X-Y (Global)
AI Impact: Low/Medium/High · Growth: High
Top Universities: [3 real names]
[2-3 sentence detailed description]

(blank line between each degree)

RULES:
- REAL universities, REAL salaries
- NEVER say "varies"
- Use Indian context
- Plain text format
- Use [ DEGREE CARDS ] as the exact marker`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          if (buffer.includes("[ DEGREE CARDS ]")) {
            const items = extractDegreesFromMarker(buffer);
            if (items.length > 0) setParsedItems(items);
          }
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        },
        onDone: () => setLoading(false),
        onError: (err) => {
          console.error('[ExploreDegrees] Error:', err);
          setError(err.message || 'Failed to find degrees.');
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

For degrees related to "${searchQuery}", write a HIGHLY DETAILED guide, then 12 clickable degree cards.

=== PART 1: DETAILED GUIDE ===

Write 3-4 paragraphs about this field of study.

Then 5 "Key Insights" bullet points with real numbers.

Then "Top Universities" — 5 institutions globally.

=== PART 2: DEGREE CARDS ===

After the guide, write EXACTLY:

[ DEGREE CARDS ]

Then list 12 degrees EACH like:

Degree Name
Level: Undergraduate/Postgraduate · Duration: X years
Salary: ₹X-Y LPA (India) | $X-Y (Global)
AI Impact: Low/Medium/High · Growth: High
Top Universities: [3 real names]
[2-3 sentence description]

RULES:
- REAL universities, REAL salaries
- NEVER say "varies"
- Plain text`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          if (buffer.includes("[ DEGREE CARDS ]")) {
            const items = extractDegreesFromMarker(buffer);
            if (items.length > 0) setParsedItems(items);
          }
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

  const guideText = streamedText.split("[ DEGREE CARDS ]")[0] || "";

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

      {guideText && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <SmartMarkdown text={guideText} />
          {loading && !streamedText.includes("[ DEGREE CARDS ]") && (
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
              🎓 {parsedItems.length} degrees to explore
              {loading && <span className="text-primary italic"> (streaming...)</span>}
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
    </div>
  );
}

function extractDegreesFromMarker(text) {
  const markerIdx = text.indexOf("[ DEGREE CARDS ]");
  if (markerIdx === -1) return [];
  const block = text.slice(markerIdx + "[ DEGREE CARDS ]".length);

  const lines = block.split("\n").map(l => l.trim());
  const items = [];
  let current = null;
  let paragraphs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const isKey = /^(Stream|Duration|Salary|AI Impact|Level|Top Universities)\s*:/i.test(line);
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

    const durationMatch = line.match(/^Duration:\s*([^·]+?)(?:\s*·\s*Level:\s*(.+))?$/i);
    if (durationMatch) {
      current.duration = durationMatch[1].trim();
      if (durationMatch[2]) current.tags.push(durationMatch[2].trim());
      continue;
    }

    const levelMatch = line.match(/^Level:\s*([^·]+?)(?:\s*·\s*Duration:\s*(.+))?$/i);
    if (levelMatch) {
      if (!current.duration && levelMatch[2]) current.duration = levelMatch[2].trim();
      current.tags.push(levelMatch[1].trim());
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

    const unisMatch = line.match(/^Top Universities:\s*(.+)/i);
    if (unisMatch) { current.tags.push("🎓 " + unisMatch[1].trim()); continue; }

    paragraphs.push(line);
  }

  if (current && (current.salary || current.duration)) {
    current.description = paragraphs.join(" ").trim();
    items.push(current);
  }

  return items;
}