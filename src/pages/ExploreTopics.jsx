import { useState } from "react";
import { Compass, Search, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLMStreamArray } from "@/api/llm";
import { parseAIResponse, extractArray } from "@/lib/aiResponseHandler";
import SectionHeader from "../components/SectionHeader";
import CareerCard from "../components/CareerCard";
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

const FUN_FACTS = [
  "AI/ML roles grew 40% in 2024 — fastest of any tech field.",
  "Careers combining tech + creativity are the most AI-resistant.",
  "Data Science salaries in India grew 22% year-over-year.",
  "Green tech jobs will reach 24 million worldwide by 2030.",
  "Healthcare + tech roles have the lowest AI disruption risk.",
];

export default function ExploreTopics() {
  const { deductCredit } = useCredits();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [results, setResults] = useState([]);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [funFact] = useState(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);

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
    setThinking("💭 Analyzing your topic...");

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

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences. Start your response with { and end with }.`;

    let fullJson = "";

    try {
      await invokeLLMStreamArray({
        prompt,
        arrayKey: "careers",
        onThinking: (text) => setThinking(text),
        onItem: (item) => {
          setResults(prev => [...prev, item]);
        },
        onDone: async () => {
          // Fallback if no items extracted
          if (results.length === 0 && fullJson) {
            const parsed = parseAIResponse(fullJson);
            if (parsed.type === 'json') {
              const arr = extractArray(parsed.data, ['careers', 'matches', 'results']);
              setResults(arr);
            } else if (parsed.type === 'markdown') {
              setMarkdownFallback(parsed.raw);
            }
          }
          setThinking("");
          setLoading(false);
        },
        onError: (err) => {
          console.error('[ExploreTopics] Error:', err);
          setError(err.message || 'Failed to find careers. Please try again.');
          setThinking("");
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[ExploreTopics] Catch error:', err);
      setError(err.message || 'Failed to find careers.');
      setThinking("");
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

      {/* Thinking indicator */}
      {loading && results.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-heading font-semibold text-primary">{thinking}</p>
          </div>
          <div className="bg-white/50 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">💡 Fun Fact</p>
            <p className="text-sm text-foreground">{funFact}</p>
          </div>
        </motion.div>
      )}

      {/* Results — cards appear one by one as they stream in */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{results.length}</span>
              {loading && <span className="text-primary italic"> (streaming...)</span>}
              {" "}career paths found for <span className="font-semibold text-foreground">{selectedTopic}</span>
            </p>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {results.map((career, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CareerCard career={career} index={i} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Markdown fallback */}
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
          ">
            <ReactMarkdown>{markdownFallback}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}