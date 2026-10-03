import { useState, useRef } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { invokeLLMStream } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";

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
  const [location, setLocation] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [streamedText, setStreamedText] = useState("");
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
    setError(null);
    setSelectedLocation(loc);

    const prompt = `You are Collade AI, an expert study-abroad and career guidance assistant.

Give a comprehensive guide to studying and working in "${loc}" in clean MARKDOWN format.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

# ${loc}

[3-4 sentence overview — the city/country, why students go there, what makes it special]

## 🎓 Top Universities
- **[Real university 1]** — rank/specialty
- **[Real university 2]** — rank/specialty
- **[Real university 3]**
- **[Real university 4]**
- **[Real university 5]**

## 💰 Cost of Living (Student)
- **Rent:** [specific range in local currency + INR]
- **Food:** [monthly range]
- **Transport:** [monthly]
- **Total monthly:** [X local currency / ~₹Y INR]

## 💵 Salary Expectations
- **Fresh graduate:** [X local currency / ~₹Y]
- **Mid-career (5 yrs):** [X local currency]
- **Senior (10+ yrs):** [X local currency]

## 🛂 Visa Path
- **Student visa:** [specific name + process]
- **Work permit after graduation:** [specific name + duration]
- **Path to PR:** [if applicable]

## 💼 Top Careers There
### [Career 1]
- **Salary:** [X local currency / ~₹Y]
- **AI Impact:** Medium · **Growth:** High
[2-3 sentences about the role specifically in this location]

### [Career 2]
(same format)

(repeat for 6-8 careers)

## 🌟 Best For
- [Type of student 1 who thrives here]
- [Type of student 2]
- [Type of student 3]

RULES:
- Use REAL university names, REAL salary ranges in LOCAL currency
- Include INR conversion where helpful
- Keep under 700 words
- Use emojis for headers
- Bold all key numbers
- NO JSON, NO code blocks`;

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
            prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
            prose-p:text-muted-foreground prose-p:my-2 prose-p:leading-relaxed
            prose-li:text-muted-foreground prose-li:my-1
            prose-strong:text-foreground prose-strong:font-semibold
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
    </FeatureGate>
  );
}