import { useState, useRef } from "react";
import { Compass, Search, Loader2, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

For the topic/interest "${topic}", list the TOP 8 career paths.

FORMAT EXACTLY LIKE THIS — use ## for each career:

# ${topic} — Career Pathways

## [Career 1 Name]
- **Stream:** [specific field]
- **Duration:** X years · **Level:** Undergraduate/Postgraduate/Certification
- **Salary:** ₹X-Y LPA (India) | $X-Y USD (Global)
- **AI Impact:** Low/Medium/High · **Growth:** High/Medium
[2-3 sentence description — what they actually do]

## [Career 2 Name]
(same format)

(repeat for 8 careers — mix mainstream + niche + emerging)

RULES:
- REAL career titles, REAL salary numbers with currency
- NEVER say "varies" — give specific ranges
- Each description: 2-3 sentences max
- Keep total under 700 words
- NO JSON, NO code blocks, NO extra text before # heading`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          const items = extractCareersFromMarkdown(buffer);
          if (items.length > 0) setParsedItems(items);
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

      {/* Thinking indicator — only before any text arrives */}
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

      {/* Live streaming markdown — shows while loading regardless of parsed items */}
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

      {/* Cards — build up below as items are parsed */}
      {parsedItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{parsedItems.length}</span>
              {loading && <span className="text-primary italic"> (streaming...)</span>}
              {" "}career paths found
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

      {/* Markdown fallback — only if loading done AND no cards parsed */}
      {!loading && streamedText && parsedItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-6 sm:p-8"
        >
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

function extractCareersFromMarkdown(text) {
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
    const streamMatch = body.match(/\*\*Stream:\*\*\s*([^\n·|]+)/i);
    if (streamMatch) item.tags.push(streamMatch[1].trim().replace(/[·|].*/, '').trim());
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