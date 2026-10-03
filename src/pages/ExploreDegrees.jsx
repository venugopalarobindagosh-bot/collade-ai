import { useState } from "react";
import { GraduationCap, Search, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLM } from "@/api/llm";
import { parseAIResponse, extractArray } from "@/lib/aiResponseHandler";
import SectionHeader from "../components/SectionHeader";
import CareerCard from "../components/CareerCard";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

const LEVELS = ["Undergraduate", "Postgraduate", "Doctorate", "Diploma", "Professional Certification"];

const STREAMS = [
  "Science & Technology", "Commerce & Business", "Arts & Humanities", "Engineering",
  "Medicine & Health", "Law", "Design & Architecture", "Education",
  "Agriculture & Environment", "Media & Communication", "Social Sciences", "Performing Arts"
];

export default function ExploreDegrees() {
  const { deductCredit } = useCredits();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [results, setResults] = useState([]);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  const fetchDegrees = async (level, stream) => {
    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setResults([]);
    setMarkdownFallback("");
    setError(null);

    try {
      const prompt = `You are a comprehensive career guidance database. List 8 diverse degrees/programs at the ${level} level in the ${stream} stream.

For each, provide detailed info. Include mainstream AND niche/emerging programs. Cover global options.

Return a JSON object with a "degrees" array. Each degree should have:
- name (string)
- stream (string)
- specialization (string)
- level (string)
- duration (string)
- short_description (string)
- salary_range (string)
- ai_impact (string: "High", "Medium", or "Low")
- growth (string)
- locations (array of strings)
- required_subjects (array of strings)
- entrance_exams (array of strings)

CRITICAL RULES:
- Return EXACTLY 8 degrees, no more, no less
- Return ONLY valid JSON. No markdown, no code fences, no text before or after
- Keep each degree's text concise (1-2 sentences per field)
- Start with { and end with }
- The response MUST be complete and parseable as JSON`;

      const response = await invokeLLM({ prompt, query: prompt });
      console.log('[ExploreDegrees] Raw response:', response);

      const parsed = parseAIResponse(response);
      console.log('[ExploreDegrees] Parsed type:', parsed.type);

      if (parsed.type === 'json') {
        const degrees = extractArray(parsed.data, ['degrees', 'programs', 'results']);
        console.log('[ExploreDegrees] Extracted degrees:', degrees.length);
        setResults(degrees);
        if (degrees.length === 0) setMarkdownFallback(parsed.raw);
      } else if (parsed.type === 'markdown') {
        setMarkdownFallback(parsed.raw);
      } else {
        setError('No results returned. Please try again.');
      }
    } catch (error) {
      console.error('[ExploreDegrees] Error:', error);
      setError(error.message || 'Failed to find degrees. Please try again.');
    } finally {
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

    setLoading(true);
    setResults([]);
    setMarkdownFallback("");
    setError(null);
    setSelectedLevel(null);
    setSelectedStream(null);

    try {
      const prompt = `Search for degrees, courses, and programs related to: "${searchQuery}". Return 8 diverse results across all levels and streams globally.

Return a JSON object with a "degrees" array. Each degree should have:
- name (string)
- stream (string)
- specialization (string)
- level (string)
- duration (string)
- short_description (string)
- salary_range (string)
- ai_impact (string: "High", "Medium", or "Low")
- growth (string)
- locations (array of strings)

CRITICAL RULES:
- Return EXACTLY 8 degrees, no more, no less
- Return ONLY valid JSON. No markdown, no code fences
- Keep each degree's text concise
- Start with { and end with }`;

      const response = await invokeLLM({ prompt, query: prompt });
      console.log('[ExploreDegrees] Search response:', response);

      const parsed = parseAIResponse(response);
      console.log('[ExploreDegrees] Parsed type:', parsed.type);

      if (parsed.type === 'json') {
        const degrees = extractArray(parsed.data, ['degrees', 'programs', 'results']);
        setResults(degrees);
        if (degrees.length === 0) setMarkdownFallback(parsed.raw);
      } else if (parsed.type === 'markdown') {
        setMarkdownFallback(parsed.raw);
      } else {
        setError('No results returned. Please try again.');
      }
    } catch (error) {
      console.error('[ExploreDegrees] Search error:', error);
      setError(error.message || 'Failed to search degrees. Please try again.');
    } finally {
      setLoading(false);
    }
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

      {loading && <LoadingGrid text="Finding degrees and programs..." />}

      {!loading && results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length} programs found
            {selectedLevel && selectedStream ? ` for ${selectedLevel} in ${selectedStream}` : ""}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {results.map((degree, i) => (
              <CareerCard key={i} career={degree} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {!loading && markdownFallback && results.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Programs found{selectedLevel && selectedStream ? ` for ${selectedLevel} in ${selectedStream}` : ""}:
          </p>
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
  );
}