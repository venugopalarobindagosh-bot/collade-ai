import { useState, useRef } from "react";
import { Compass, Search, Loader2, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

const TOPICS = [
  { name: "Artificial Intelligence & ML", emoji: "🤖" },
  { name: "Robotics & Automation", emoji: "⚙️" },
  { name: "Video Games & Esports", emoji: "🎮" },
  { name: "Space & Astronomy", emoji: "🚀" },
  { name: "Marine Life & Ocean Science", emoji: "🐠" },
  { name: "Psychology & Mental Health", emoji: "🧠" },
  { name: "Music & Audio Production", emoji: "🎵" },
  { name: "Art & Visual Design", emoji: "🎨" },
  { name: "Coding & Software Dev", emoji: "💻" },
  { name: "Business & Entrepreneurship", emoji: "📈" },
  { name: "Film & Animation", emoji: "🎬" },
  { name: "Medicine & Surgery", emoji: "🏥" },
  { name: "Environmental Science", emoji: "🌍" },
  { name: "Fashion & Textiles", emoji: "👗" },
  { name: "Sports & Fitness", emoji: "⚽" },
  { name: "Cooking & Food Science", emoji: "🍳" },
  { name: "Law & Justice", emoji: "⚖️" },
  { name: "Writing & Journalism", emoji: "✍️" },
  { name: "Photography & Videography", emoji: "📸" },
  { name: "Cybersecurity & Ethical Hacking", emoji: "🔒" },
  { name: "Architecture & Interior Design", emoji: "🏛️" },
  { name: "Finance & Investing", emoji: "💰" },
  { name: "Blockchain & Crypto", emoji: "🔗" },
  { name: "Travel & Hospitality", emoji: "✈️" },
];

export default function ExploreTopics() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const fetchTopic = async (topic) => {
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

For the topic/interest "${topic}", write a HIGHLY DETAILED career guide, then list 12 clickable career cards.

=== PART 1: DETAILED GUIDE ===

Write 3-4 paragraphs covering:
- Overview of this field and why it matters in 2025-2030
- Key industry trends and statistics (real numbers)
- What makes careers here different from other fields
- Emerging opportunities and AI disruption risk

Then 5-7 bullet points of "Key Insights" with real numbers.

Then a "Best Locations" section listing top 5 cities/countries globally.

Then a "How to Start" section with 5 concrete action steps.

=== PART 2: CAREER CARDS ===

After the guide, write EXACTLY this marker on its own line:

[ CAREER CARDS ]

Then list 12 careers, EACH in this EXACT format (no #, no **, no bullets):

Career Name Here
Stream: Specific field name
Duration: X years · Level: Undergraduate/Postgraduate/Certification
Salary: ₹X-Y LPA (India) | $X-Y USD (Global)
AI Impact: Low/Medium/High · Growth: High/Medium
[2-3 sentence detailed description of what this role does and who it suits]

(blank line between each career)

RULES:
- REAL numbers, REAL universities, REAL certifications
- NEVER say "varies"
- Use Indian context
- Plain text only — no markdown symbols like ## or **
- Use [ CAREER CARDS ] as the exact marker (with brackets and spaces)`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          if (buffer.includes("[ CAREER CARDS ]")) {
            const items = extractCardsFromMarker(buffer);
            if (items.length > 0) setParsedItems(items);
          }
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        },
        onDone: () => setLoading(false),
        onError: (err) => {
          console.error('[ExploreTopics] Error:', err);
          setError(err.message || 'Failed to find careers. Please try again.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[ExploreTopics] Catch error:', err);
      setError(err.message || 'Failed to find careers.');
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setSelectedTopic(searchQuery.trim());
    fetchTopic(searchQuery.trim());
  };

  const openCareerDetail = (careerName) => {
    navigate(`/career-detail?name=${encodeURIComponent(careerName)}&stream=${encodeURIComponent(selectedTopic || "")}`);
  };

  const guideText = streamedText.split("[ CAREER CARDS ]")[0] || "";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Explore by Topic"
        subtitle="Start from what you love — find every career path linked to your interests"
        icon={Compass}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Type any interest — 'drones', 'music therapy', 'game design', 'sustainability'..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {TOPICS.map((topic, i) => (
          <motion.button
            key={topic.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => {
              setSelectedTopic(topic.name);
              setSearchQuery("");
              fetchTopic(topic.name);
            }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              selectedTopic === topic.name
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border hover:border-primary/30"
            }`}
          >
            <span className="text-base">{topic.emoji}</span>
            <span className="truncate text-xs sm:text-sm">{topic.name}</span>
          </motion.button>
        ))}
      </div>

      {loading && !streamedText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-heading font-semibold text-primary">💭 Analyzing "{selectedTopic}"...</p>
          </div>
        </motion.div>
      )}

      {/* PART 1 — Detailed guide */}
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

      {/* PART 2 — Career cards */}
      {parsedItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              💼 {parsedItems.length} career paths to explore
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

function extractCardsFromMarker(text) {
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