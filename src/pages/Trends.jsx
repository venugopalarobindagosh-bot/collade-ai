import { useState, useRef } from "react";
import { invokeLLM } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import SectionHeader from "@/components/SectionHeader";
import LoadingGrid from "@/components/LoadingGrid";

const STREAMS = ["Technology", "Healthcare", "Business", "Arts & Design", "Science", "Law", "Education", "Engineering"];

export default function Trends() {
  const [selectedStream, setSelectedStream] = useState("Technology");
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { deductCredit } = useCredits();
  const fetchedRef = useRef(false);

  const fetchTrends = async (stream) => {
    const ok = await deductCredit();
    if (!ok) { 
      window.dispatchEvent(new CustomEvent("collade:upgrade")); 
      return; 
    }
    
    setLoading(true);
    setTrends(null);
    setError(null);
    
    try {
      const prompt = `You are a career trends expert. Provide the top 8 emerging career trends in "${stream}" for 2024-2030. 

For each trend include:
- title (string)
- description (string, 1-2 sentences)
- growth_rate (string, e.g. "35% YoY")
- demand (string: "High", "Medium", or "Low")
- key_skills (array of 3-4 skills)
- ai_impact (string: "Transforming", "Growing", or "Stable")

Return a JSON object with:
- stream (string)
- summary (string)
- trends (array of the above objects)`;

      const response = await invokeLLM({ 
        prompt: prompt,
        query: prompt
      });

      console.log('[Trends] Raw response:', response);

      // Parse the response
      let parsedData = null;
      
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[Trends] JSON parse error:', e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      // Build trends object
      let trendsData = {
        stream: stream,
        summary: parsedData?.summary || `Top emerging trends in ${stream}`,
        trends: parsedData?.trends || []
      };

      // If no trends, create fallback
      if (trendsData.trends.length === 0 && typeof response === 'string') {
        // Try to extract trends from text response
        const lines = response.split('\n').filter(line => line.trim());
        trendsData.trends = lines.slice(0, 8).map((line, i) => ({
          title: `Trend ${i + 1}`,
          description: line.substring(0, 150),
          growth_rate: "Varies",
          demand: "Medium",
          key_skills: ["Adaptability", "Learning", "Problem Solving"],
          ai_impact: "Growing"
        }));
      }

      console.log('[Trends] Parsed trends:', trendsData);
      setTrends(trendsData);

    } catch (error) {
      console.error('[Trends] Error:', error);
      setError(error.message || 'Failed to fetch trends. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStreamSelect = (stream) => {
    setSelectedStream(stream);
    fetchTrends(stream);
  };

  const demandColor = { High: "text-green-600 bg-green-50", Medium: "text-amber-600 bg-amber-50", Low: "text-red-600 bg-red-50" };
  const aiColor = { Transforming: "text-purple-600 bg-purple-50", Growing: "text-blue-600 bg-blue-50", Stable: "text-gray-600 bg-gray-50" };

  return (
    <div>
      <SectionHeader
        title="Career Trends"
        subtitle="Discover what's growing in each field — powered by AI"
        icon={TrendingUp}
      />

      {/* Stream selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STREAMS.map((s) => (
          <button
            key={s}
            onClick={() => handleStreamSelect(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              selectedStream === s
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Refresh button */}
      {trends && !loading && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={() => fetchTrends(selectedStream)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      )}

      {loading && <LoadingGrid text="Analyzing career trends..." />}

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !trends && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Select a stream above to explore career trends</p>
        </div>
      )}

      {!loading && trends?.trends && (
        <>
          {trends.summary && (
            <p className="text-sm text-muted-foreground mb-5 bg-secondary/50 rounded-xl px-4 py-3">{trends.summary}</p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {trends.trends.map((trend, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-semibold text-base">{trend.title}</h3>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${aiColor[trend.ai_impact] || aiColor.Stable}`}>
                    {trend.ai_impact || "Growing"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{trend.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                    📈 {trend.growth_rate || "Varies"}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${demandColor[trend.demand] || demandColor.Medium}`}>
                    Demand: {trend.demand || "Medium"}
                  </span>
                </div>
                {trend.key_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {trend.key_skills.map((skill, j) => (
                      <span key={j} className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}