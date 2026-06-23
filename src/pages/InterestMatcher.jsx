import { useState } from "react";
import { Sparkles, X, Plus, ArrowRight } from "lucide-react";
import { invokeLLM } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import SectionHeader from "../components/SectionHeader";
import CareerCard from "../components/CareerCard";
import LoadingGrid from "../components/LoadingGrid";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTIONS = [
  "Drawing", "Coding", "Cooking", "Photography", "Writing", "Music", "Dancing",
  "Gaming", "Reading", "Sports", "Traveling", "Animals", "Science experiments",
  "Building things", "Social media", "Teaching", "Volunteering", "Puzzles",
  "Nature", "Math", "History", "Languages", "Debating", "Gardening", "Astronomy",
  "Film making", "3D modeling", "Yoga", "Swimming", "Chess"
];

export default function InterestMatcher() {
  const { deductCredit } = useCredits();
  const [interests, setInterests] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addInterest = (interest) => {
    if (interest && !interests.includes(interest) && interests.length < 10) {
      setInterests([...interests, interest]);
    }
    setInputVal("");
  };

  const removeInterest = (interest) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const findMatches = async () => {
    if (interests.length === 0) return;
    
    setError(null);
    const ok = await deductCredit();
    if (!ok) { 
      window.dispatchEvent(new CustomEvent("collade:upgrade")); 
      return; 
    }
    
    setLoading(true);
    setResults([]);
    
    try {
      const prompt = `A student has the following interests and hobbies: ${interests.join(", ")}.

Based on these interests, suggest 10 diverse and creative career paths, degrees, diplomas, and certifications that would be an excellent fit. Include:
- Mainstream options
- Niche/unconventional paths
- Emerging fields
- Options at different education levels (diploma, undergraduate, postgraduate, certification)
- Global opportunities

For each, explain WHY it matches their interests. Be creative and think outside the box.

Format your response as a JSON object with a "matches" array. Each match should have:
- name (string)
- stream (string)
- level (string)
- duration (string)
- short_description (string)
- why_it_fits (string)
- salary_range (string)
- ai_impact (string: "High", "Medium", or "Low")
- growth (string)
- locations (array of strings)
- skills_needed (array of strings)
- future_proof_score (string)`;

      const response = await invokeLLM({ 
        prompt: prompt,
        query: prompt
      });

      console.log('[InterestMatcher] Raw response:', response);

      // Parse the response - try to extract JSON
      let parsedData = null;
      
      if (typeof response === 'string') {
        // Try to find JSON in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[InterestMatcher] JSON parse error:', e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      // Extract matches from parsed data
      let matches = [];
      if (parsedData?.matches) {
        matches = parsedData.matches;
      } else if (Array.isArray(parsedData)) {
        matches = parsedData;
      } else {
        // Try to extract from the response string
        const lines = response.split('\n').filter(line => line.trim());
        // If we can't parse JSON, create a simple match from the response
        matches = [{
          name: "Career Matches",
          stream: "Various",
          level: "Varies",
          duration: "Varies",
          short_description: response.substring(0, 200) + "...",
          why_it_fits: "Based on your interests",
          salary_range: "Varies by career",
          ai_impact: "Medium",
          growth: "Varies",
          locations: ["Global"],
          skills_needed: ["Adaptability", "Learning"],
          future_proof_score: "Good"
        }];
      }

      console.log('[InterestMatcher] Parsed matches:', matches);
      setResults(matches);

    } catch (error) {
      console.error('[InterestMatcher] Error:', error);
      setError(error.message || 'Failed to find career matches. Please try again.');
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader
        title="Interest Matcher"
        subtitle="Add your interests and hobbies — AI will find your perfect career matches"
        icon={Sparkles}
      />

      {/* Input area */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addInterest(inputVal.trim());
              }
            }}
            placeholder="Type an interest or hobby and press Enter..."
            className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => addInterest(inputVal.trim())}
            className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Selected interests */}
        <AnimatePresence>
          {interests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-wrap gap-2"
            >
              {interests.map((interest) => (
                <motion.span
                  key={interest}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium"
                >
                  {interest}
                  <button onClick={() => removeInterest(interest)} className="hover:bg-primary/20 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((s) => !interests.includes(s)).slice(0, 15).map((s) => (
              <button
                key={s}
                onClick={() => addInterest(s)}
                className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* Find matches button */}
        <button
          onClick={findMatches}
          disabled={interests.length === 0 || loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-opacity shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-4 w-4" />
          Find My Career Matches ({interests.length} interest{interests.length !== 1 ? "s" : ""})
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {loading && <LoadingGrid text="AI is analyzing your interests..." />}

      {!loading && results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{results.length} matches</span> found for your interests
          </p>
          {results.map((match, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <CareerCard career={match} index={i} />
                {match.why_it_fits && (
                  <div className="ml-1 pl-4 border-l-2 border-primary/30">
                    <p className="text-xs font-semibold text-primary">Why this fits you:</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{match.why_it_fits}</p>
                  </div>
                )}
                {match.future_proof_score && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium bg-accent/10 text-accent px-2 py-1 rounded-md">
                      Future-proof: {match.future_proof_score}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}