import { useState, useRef } from "react";
import { Compass, Search, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
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
  const [streamedText, setStreamedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [funFact] = useState(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
  const scrollRef = useRef(null);

  const fetchTopic = async (topic) => {
    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setStreamedText("");
    setError(null);

    const prompt = `You are Collade AI, an expert career intelligence assistant.

For the topic/interest "${topic}", give a comprehensive career guide in clean MARKDOWN format.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

# [Topic Name] — Career Pathways

[2-3 sentence overview of this field's career landscape]

## 🎓 Degrees & Programs
- **Bachelor's in [specific name]** — X years. Why it works for this field.
- **Master's in [specific name]** — X years. Advanced specialization.
- **Diploma/Certification in [specific name]** — X months. Fast-track option.
- **Professional Certification: [real name like "AWS Certified ML"]** — X months.
(6-8 options, mix of mainstream + niche)

## 💼 Top Career Paths
### [Career 1 — e.g., "Machine Learning Engineer"]
- **Salary (India):** ₹X-Y LPA | **Global:** $X-Y USD
- **Growth:** High/Medium · **AI Impact:** Low/Medium/High
[2-3 sentence description — what they actually do]

### [Career 2]
(same structure)

(repeat for 6-8 careers)

## 🚀 Skills to Build
- **[Skill 1]** — why it matters + how to start
- **[Skill 2]**
(5-6 skills)

## 🌍 Best Locations
- **India:** [specific cities]
- **Global:** [specific countries/cities]

## ⚡ Action Steps for Students
1. [Specific first step]
2. [Specific second step]
3. [Specific third step]

RULES:
- Use REAL names, REAL salaries with actual currency (₹, $), REAL universities/certifications
- NEVER say "varies" — always give specific numbers or ranges
- Use Indian context where relevant
- Keep the whole response under 700 words
- Use emojis for section headers
- Bold every key term
- NO JSON, NO code blocks, NO extra text before # heading`;

    try {
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          setStreamedText(prev => prev + text);
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

      {/* Thinking indicator — only when no streamed text yet */}
      {loading && !streamedText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-heading font-semibold text-primary">💭 Analyzing "{selectedTopic}"...</p>
          </div>
          <div className="bg-white/50 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">💡 Fun Fact</p>
            <p className="text-sm text-foreground">{funFact}</p>
          </div>
        </motion.div>
      )}

      {/* Streaming markdown output */}
      {streamedText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-h-[80vh] overflow-y-auto"
          ref={scrollRef}
        >
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-h1:text-2xl prose-h1:mt-0 prose-h1:mb-4 prose-h1:text-primary
            prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-primary prose-h2:border-b prose-h2:border-border prose-h2:pb-2
            prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-foreground
            prose-p:text-muted-foreground prose-p:my-2 prose-p:leading-relaxed
            prose-li:text-muted-foreground prose-li:my-1
            prose-strong:text-foreground prose-strong:font-semibold
            prose-code:text-primary prose-code:bg-secondary prose-code:px-1 prose-code:rounded
            prose-ul:my-2 prose-ol:my-2
          ">
            <ReactMarkdown>{streamedText}</ReactMarkdown>
          </div>
          {loading && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground italic">writing...</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}