import { useState } from "react";
import { MapPin, Search, Globe } from "lucide-react";
import { invokeLLM } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
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
    setError(null);
    setSelectedLocation(loc);
    
    try {
      console.log("[DreamLocation] Fetching for:", loc);
      
      const prompt = `For the location "${loc}", provide a comprehensive career and education guide:

1. Top universities and institutions in this location
2. In-demand career fields and degrees
3. Average salaries for graduates
4. Visa/work permit information for international students
5. Cost of living context
6. Top 10 recommended degrees/courses available there

Be specific and accurate for this location.

Return a JSON object with:
- location_name (string)
- overview (string)
- top_universities (array of strings)
- visa_info (string)
- cost_of_living (string)
- avg_graduate_salary (string)
- careers (array of objects with: name, stream, level, duration, short_description, salary_range, ai_impact, growth, locations, top_universities_for_this)`;

      const response = await invokeLLM({ 
        prompt: prompt,
        query: prompt
      });

      console.log("[DreamLocation] Raw response:", response);

      // Parse the response
      let parsedData = null;
      
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error("[DreamLocation] JSON parse error:", e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      // Build results object
      const resultData = {
        location_name: parsedData?.location_name || loc,
        overview: parsedData?.overview || (typeof response === 'string' ? response.substring(0, 300) + "..." : "Explore opportunities in this location"),
        top_universities: parsedData?.top_universities || [],
        visa_info: parsedData?.visa_info || "Varies by country and program",
        cost_of_living: parsedData?.cost_of_living || "Varies by city",
        avg_graduate_salary: parsedData?.avg_graduate_salary || "Varies by field",
        careers: parsedData?.careers || []
      };

      // If no careers, create a fallback
      if (resultData.careers.length === 0) {
        resultData.careers = [{
          name: `Programs in ${loc}`,
          stream: "Various",
          level: "Various",
          duration: "Varies",
          short_description: typeof response === 'string' ? response.substring(0, 200) + "..." : "Explore programs available in this location",
          salary_range: "Varies",
          ai_impact: "Medium",
          growth: "Varies",
          locations: [loc],
          top_universities_for_this: resultData.top_universities || []
        }];
      }

      console.log("[DreamLocation] Parsed results:", resultData);
      setResults(resultData);

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

      {/* Search */}
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

      {/* Popular locations */}
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

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {loading && <LoadingGrid text={`Exploring opportunities in ${selectedLocation}...`} />}

      {!loading && results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Location overview */}
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

            {results.top_universities && results.top_universities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Universities</p>
                <div className="flex flex-wrap gap-1.5">
                  {results.top_universities.map((uni, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium">
                      {uni}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Career results */}
          {results.careers && results.careers.length > 0 && (
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
    </div>
    </FeatureGate>
  );
}