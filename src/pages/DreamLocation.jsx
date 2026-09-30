import { useState } from "react";
import { MapPin, Search, Globe } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { invokeLLM } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import { parseAIResponse } from "@/lib/aiResponseHandler";
import FeatureGate from "../components/FeatureGate";
import SectionHeader from "../components/SectionHeader";
import CareerCard from "../components/CareerCard";
import LoadingGrid from "../components/LoadingGrid";
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
  const [results, setResults] = useState(null);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLocationData = async (loc) => {
    const ok = await deductCredit();
    if (!ok) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setResults(null);
    setMarkdownFallback("");
    setError(null);
    setSelectedLocation(loc);

    try {
      console.log("[DreamLocation] Fetching for:", loc);

      const prompt = `For the location "${loc}", provide a comprehensive career and education guide.

Return a JSON object with:
- location_name (string)
- overview (string)
- top_universities (array of strings)
- visa_info (string)
- cost_of_living (string)
- avg_graduate_salary (string)
- careers (array of objects with: name, stream, level, duration, short_description, salary_range, ai_impact, growth, locations)

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences. Start with { and end with }.`;

      const response = await invokeLLM({ prompt, query: prompt });
      console.log("[DreamLocation] Raw response:", response);

      const parsed = parseAIResponse(response);
      console.log("[DreamLocation] Parsed type:", parsed.type);

      if (parsed.type === 'json' && parsed.data) {
        const d = parsed.data;
        setResults({
          location_name: d.location_name || loc,
          overview: d.overview || "",
          top_universities: d.top_universities || [],
          visa_info: d.visa_info || "",
          cost_of_living: d.cost_of_living || "",
          avg_graduate_salary: d.avg_graduate_salary || "",
          careers: d.careers || [],
        });
      } else if (parsed.type === 'markdown') {
        setMarkdownFallback(parsed.raw);
      } else {
        setError("No location data returned. Please try again.");
      }
    } catch (error) {
      console.error("[DreamLocation] Error:", error);
      setError(error.message || "Failed to fetch location data. Please try again.");
    } finally {
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

      {loading && <LoadingGrid text={`Exploring opportunities in ${selectedLocation}...`} />}

      {!loading && results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-bold">{results.location_name || selectedLocation}</h3>
            </div>
            {results.overview && <p className="text-sm text-muted-foreground">{results.overview}</p>}

            <div className="grid sm:grid-cols-3 gap-3">
              {results.avg_graduate_salary && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Graduate Salary</p>
                  <p className="font-heading font-bold mt-0.5">{results.avg_graduate_salary}</p>
                </div>
              )}
              {results.cost_of_living && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost of Living</p>
                  <p className="font-heading font-bold mt-0.5">{results.cost_of_living}</p>
                </div>
              )}
              {results.visa_info && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visa Info</p>
                  <p className="text-xs mt-0.5">{results.visa_info}</p>
                </div>
              )}
            </div>

            {results.top_universities?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Universities</p>
                <div className="flex flex-wrap gap-1.5">
                  {results.top_universities.map((uni, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium">{uni}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {results.careers?.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{results.careers.length} programs</span> available in {selectedLocation}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {results.careers.map((career, i) => (
                  <CareerCard key={i} career={career} index={i} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {!loading && markdownFallback && !results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
    </FeatureGate>
  );
}