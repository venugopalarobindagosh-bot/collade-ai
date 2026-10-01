import { useState } from "react";
import { invokeLLM } from "@/api/llm";
import { useCredits } from "@/hooks/useCredits";
import { parseAIResponse, extractArray } from "@/lib/aiResponseHandler";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import SectionHeader from "@/components/SectionHeader";
import LoadingGrid from "@/components/LoadingGrid";

const STREAMS = ["Technology", "Healthcare", "Business", "Arts & Design", "Science", "Law", "Education", "Engineering"];

export default function Trends() {
  const [selectedStream, setSelectedStream] = useState("Technology");
  const [trends, setTrends] = useState(null);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { deductCredit } = useCredits();

  const fetchTrends = async (stream) => {
    const ok = await deductCredit();
    if (!ok) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setTrends(null);
    setMarkdownFallback("");
    setError(null);

    try {
      const prompt = `You are a career trends expert. Provide the top 15 emerging career trends in "${stream}" for 2024-2030.

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
- trends (array of 15 objects)

RULES:
- Start with { and end with }
- Do NOT wrap in markdown code fences
- Do NOT add any text before or after the JSON
- Include all 15 trends

JSON ONLY. BEGIN:`;

      const response = await invokeLLM({ prompt, query: prompt });
      console.log('[Trends] Raw response:', response);

      const parsed = parseAIResponse(response);
      console.log('[Trends] Parsed type:', parsed.type);

      if (parsed.type === 'json' && parsed.data) {
        const trendsArray = extractArray(parsed.data, ['trends', 'results', 'items']);
        setTrends({
          stream: parsed.data.stream || stream,
          summary: parsed.data.summary || "",
          trends: trendsArray,
        });
        if (trendsArray.length === 0) setMarkdownFallback(parsed.raw);
      } else if (parsed.type === 'markdown') {
        setMarkdownFallback(parsed.raw);
      } else {
        setError('No trends returned. Please try again.');
      }
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

      {trends && !loading && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={() => fetchTrends(selectedStream)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      )}

      {loading && <LoadingGrid text="Analyzing career trends..." />}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !trends && !markdownFallback && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Select a stream above to explore career trends</p>
        </div>
      )}

      {!loading && trends?.trends && trends.trends.length > 0 && (
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

      {!loading && markdownFallback && !trends && (
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
  );
}