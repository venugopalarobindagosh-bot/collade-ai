import { useState, useRef } from "react";
import { TrendingUp, Loader2, RefreshCw, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLMStream } from "@/api/llm";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

const STREAMS = ["Technology", "Healthcare", "Business", "Arts & Design", "Science", "Law", "Education", "Engineering"];

export default function Trends() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [selectedStream, setSelectedStream] = useState(null);
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const fetchTrends = async (stream) => {
    const ok = await deductCredit();
    if (!ok) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setStreamedText("");
    setParsedItems([]);
    setError(null);
    setSelectedStream(stream);

    const prompt = `You are Collade AI, an expert career trends analyst.

Analyze the "${stream}" industry for 2025-2030. Provide detailed trends, then list 12 emerging careers.

=== PART 1: DETAILED TREND ANALYSIS ===

Write 4-5 paragraphs covering:
- State of the "${stream}" industry in 2025-2030
- Which roles are growing vs shrinking (with real % numbers)
- AI disruption patterns — what's being automated vs amplified
- Emerging specializations and hot sub-fields
- Geographic shifts in hiring

Then 6-8 "Key Trends" bullet points with real numbers (e.g., "AI healthcare roles grew 42% YoY").

Then 5-6 "Hot Skills for 2025-2030" bullets.

Then 4-5 "Best Cities/Countries" bullets.

=== PART 2: EMERGING CAREERS ===

After the guide, write EXACTLY this marker on its own line:

[ CAREER CARDS ]

Then list 12 emerging/growing careers in ${stream}, EACH in this EXACT format:

Career Name Here
Stream: ${stream} — [specific sub-field]
Duration: X years · Level: Undergraduate/Postgraduate/Certification
Salary: ₹X-Y LPA (India) | $X-Y USD (Global)
AI Impact: Low/Medium/High · Growth: Very High/High
[2-3 sentences on why this career is trending and what the role involves]

(blank line between each career)

RULES:
- Use REAL growth percentages
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
          console.error('[Trends] Error:', err);
          setError(err.message || 'Failed to fetch trends. Please try again.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[Trends] Catch error:', err);
      setError(err.message || 'Failed to fetch trends.');
      setLoading(false);
    }
  };

  const openCareerDetail = (careerName) => {
    navigate(`/career-detail?name=${encodeURIComponent(careerName)}&stream=${encodeURIComponent(selectedStream || "")}`);
  };

  const guideText = streamedText.split("[ CAREER CARDS ]")[0] || "";

  return (
    <div>
      <SectionHeader
        title="Career Trends"
        subtitle="Discover what's growing in each field — powered by AI"
        icon={TrendingUp}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {STREAMS.map((s) => (
          <button
            key={s}
            onClick={() => fetchTrends(s)}
            disabled={loading}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border disabled:opacity-50 ${
              selectedStream === s
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {selectedStream && !loading && streamedText && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={() => fetchTrends(selectedStream)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!selectedStream && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Select a stream above to explore career trends</p>
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
            <p className="font-heading font-semibold text-primary">📈 Analyzing {selectedStream} trends...</p>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              🚀 {parsedItems.length} emerging careers in {selectedStream}
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