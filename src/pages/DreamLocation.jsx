import { useState, useRef } from "react";
import { MapPin, Search, Loader2, ChevronRight } from "lucide-react";
import { invokeLLMStream } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

const POPULAR_LOCATIONS = [
  { name: "Tokyo, Japan", emoji: "🗼" },
  { name: "London, UK", emoji: "🇬🇧" },
  { name: "New York, USA", emoji: "🗽" },
  { name: "Berlin, Germany", emoji: "🇩🇪" },
  { name: "Singapore", emoji: "🇸🇬" },
  { name: "Toronto, Canada", emoji: "🇨🇦" },
  { name: "Sydney, Australia", emoji: "🇦🇺" },
  { name: "Dubai, UAE", emoji: "🇦🇪" },
  { name: "Seoul, South Korea", emoji: "🇰🇷" },
  { name: "Amsterdam, Netherlands", emoji: "🇳🇱" },
  { name: "Bangalore, India", emoji: "🇮🇳" },
  { name: "Zurich, Switzerland", emoji: "🇨🇭" },
];

export default function DreamLocation() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const fetchLocationData = async (loc) => {
    const ok = await deductCredit();
    if (!ok) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setStreamedText("");
    setParsedItems([]);
    setError(null);
    setSelectedLocation(loc);

    const prompt = `You are Collade AI, an expert study-abroad and career guidance assistant.

For "${loc}", write a HIGHLY DETAILED location guide, then list 12 clickable career cards.

=== PART 1: DETAILED GUIDE ===

Write 4-5 paragraphs covering:
- Overview of the city/country for international students
- Why students choose this location (culture, industry, opportunity)
- Cost of living breakdown (rent, food, transport — real numbers in local currency + INR)
- Visa process and post-graduation work options
- Best universities and what they're known for

Then 5-7 "Key Facts" bullets with real numbers.

Then "Top Universities" — 5 real institutions with specialties.

Then "Visa & PR Path" — specific visa names and durations.

=== PART 2: CAREER CARDS ===

After the guide, write EXACTLY this marker on its own line:

[ CAREER CARDS ]

Then list 12 careers popular in ${loc}, EACH in this EXACT format (no #, no **):

Career Name Here
Stream: Specific field
Duration: X years · Level: Undergraduate/Postgraduate/Certification
Salary: [Local currency + INR] | Global: $X-Y USD
AI Impact: Low/Medium/High · Growth: High/Medium
[2-3 sentence description of this role specifically in ${loc}]

(blank line between each career)

RULES:
- REAL universities, REAL salaries with LOCAL currency AND INR conversion
- NEVER say "varies"
- Use local context (Japan → ¥, UK → £, USA → $, etc.)
- Plain text format
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
          console.error("[DreamLocation] Error:", err);
          setError(err.message || "Failed to fetch location data.");
          setLoading(false);
        },
      });
    } catch (err) {
      console.error("[DreamLocation] Catch error:", err);
      setError(err.message || "Failed to fetch location data.");
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (location.trim()) {
      fetchLocationData(location.trim());
    }
  };

  const openCareerDetail = (careerName) => {
    navigate(`/career-detail?name=${encodeURIComponent(careerName)}&stream=${encodeURIComponent(selectedLocation || "")}`);
  };

  const guideText = streamedText.split("[ CAREER CARDS ]")[0] || "";

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader
        title="Dream Location"
        subtitle="Type any city or country — discover courses, careers, and opportunities there"
        icon={MapPin}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Type a city or country — 'Tokyo', 'Germany', 'Silicon Valley'..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Popular Destinations</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {POPULAR_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              onClick={() => {
                setLocation(loc.name);
                fetchLocationData(loc.name);
              }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                selectedLocation === loc.name
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border hover:border-primary/30"
              }`}
            >
              <span className="text-base">{loc.emoji}</span>
              <span className="truncate">{loc.name}</span>
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
            <p className="font-heading font-semibold text-primary">🌍 Exploring {selectedLocation}...</p>
          </div>
        </motion.div>
      )}

      {guideText && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl p-6 sm:p-8">
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
              💼 {parsedItems.length} careers in {selectedLocation}
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