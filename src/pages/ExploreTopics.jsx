import { useState } from "react";
import { Compass, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLM } from "@/api/llm";
import { parseAIResponse, extractArray } from "@/lib/aiResponseHandler";
import SectionHeader from "../components/SectionHeader";
import CareerCard from "../components/CareerCard";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

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
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [results, setResults] = useState([]);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  const fetchTopic = async (topic) => {
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
      const prompt = `For the topic/interest "${topic}", list ALL related degrees, diplomas, certifications, and career paths globally.

Include: mainstream programs, niche specializations, emerging fields, professional certifications, online diplomas, and unconventional paths.

Return 12 diverse options across different education levels.

Return a JSON object with a "careers" array. Each career should have:
- name (string)
- title (string)
- stream (string)
- level (string)
- duration (string)
- short_description (string)
- salary_range (string)
- ai_impact (string: "High", "Medium", or "Low")
- growth (string)
- locations (array)
- skills_needed (array)

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation. Start your response with { and end with }.`;

      const response = await invokeLLM({
        prompt: prompt,
        query: prompt
      });

      console.log('[ExploreTopics] Raw response:', response);

      const parsed = parseAIResponse(response);
      console.log('[ExploreTopics] Parsed type:', parsed.type);

      if (parsed.type === 'json') {
        const careers = extractArray(parsed.data, ['careers', 'matches', 'results']);
        console.log('[ExploreTopics] Extracted careers:', careers.length);
        setResults(careers);
        if (careers.length === 0) {
          // JSON was parsed but array is empty — show raw as fallback
          setMarkdownFallback(parsed.raw);
        }
      } else if (parsed.type === 'markdown') {
        // AI returned markdown — show it directly
        console.log('[ExploreTopics] Rendering as markdown');
        setMarkdownFallback(parsed.raw);
      } else {
        setError('No results returned. Please try again.');
      }

    } catch (err) {
      console.error('[ExploreTopics] Error:', err);
      setError(err.message || 'Failed to find careers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSelectedTopic(searchQuery.trim());
    await fetchTopic(searchQuery.trim());
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Explore by Topic"
        subtitle="Start from what you love — find every career path linked to your interests"
        icon={Compass}
      />

      {/* Search */}
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

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Topic grid */}
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

      {/* Results */}
      {loading && <LoadingGrid text={`Finding careers in ${selectedTopic}...`} />}

      {/* Structured cards */}
      {!loading && results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length} career paths found for <span className="font-semibold text-foreground">{selectedTopic}</span>
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {results.map((career, i) => (
              <CareerCard key={i} career={career} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Markdown fallback — shows when JSON parse fails but AI returned content */}
      {!loading && markdownFallback && results.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Career paths for <span className="font-semibold text-foreground">{selectedTopic}</span>:
          </p>
          <div className="bg-card border border-border rounded-xl p-6 prose prose-invert prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
            prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1
            prose-p:text-muted-foreground prose-p:my-1.5
            prose-li:text-muted-foreground prose-li:my-0.5
            prose-strong:text-foreground
            prose-code:text-primary prose-code:bg-secondary prose-code:px-1 prose-code:rounded
          ">
            <ReactMarkdown>{markdownFallback}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}