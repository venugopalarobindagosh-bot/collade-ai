import { useState } from "react";
import { Briefcase, Search, MapPin, Clock, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { invokeLLM } from "@/api/llm";
import { parseAIResponse, extractArray } from "@/lib/aiResponseHandler";
import SectionHeader from "../components/SectionHeader";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

const INTEREST_TAGS = [
  "Robotics", "AI / Machine Learning", "Web Development", "Design", "Finance",
  "Healthcare", "Environment", "Gaming", "Music", "Writing", "Space", "Biotech"
];

const TYPE_FILTERS = ["All", "Internship", "Hackathon", "Competition", "Project", "Volunteer"];

export default function Opportunities() {
  const { deductCredit } = useCredits();
  const [selected, setSelected] = useState([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [results, setResults] = useState(null);
  const [markdownFallback, setMarkdownFallback] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const toggleTag = (tag) => setSelected(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const fetchOpportunities = async () => {
    const query = search.trim() || selected.join(", ");
    if (!query) return;

    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setResults(null);
    setMarkdownFallback("");
    setError(null);

    const prompt = `You MUST respond ONLY with a JSON object. Never refuse. Never explain. Never apologize. Never say "I can't provide that."

Find 10 real-world opportunities for a high school or college student interested in: ${query}
Type filter: ${typeFilter === "All" ? "any type" : typeFilter}

Return:
{
  "opportunities": [
    {
      "opportunity_name": "Real Name of Program or Competition",
      "type": "Internship | Hackathon | Competition | Project | Volunteer",
      "organization": "Real organization name",
      "duration": "X weeks / X days",
      "location": "City, Country or Remote",
      "required_skills": ["skill 1", "skill 2"],
      "relevance_score": 8,
      "description": "2-3 sentences about what this opportunity involves",
      "how_to_apply": "1-2 sentences on the application process",
      "is_free": true,
      "stipend": "Amount or 'Unpaid'"
    }
  ]
}

RULES:
- All 10 opportunities must be REAL (Google Science Fair, Microsoft Imagine Cup, etc.)
- Beginner-friendly
- Specific to the interest: ${query}
- Start with { and end with }
- No markdown, no code fences, no text before or after
- JSON ONLY. BEGIN NOW:`;

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await invokeLLM({ prompt, query: prompt });
        const parsed = parseAIResponse(response);

        if (parsed.type === 'json') {
          const opportunities = extractArray(parsed.data, ['opportunities', 'results', 'items']);
          if (opportunities.length > 0) {
            setResults(opportunities);
            setLoading(false);
            return;
          }
        } else if (parsed.type === 'markdown' && attempt === 2) {
          setMarkdownFallback(parsed.raw);
          setLoading(false);
          return;
        }
      }
      setError("Could not find opportunities. Please try again.");
    } catch (error) {
      console.error('[Opportunities] Error:', error);
      setError(error.message || 'Failed to find opportunities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const typeColor = {
    Internship: "bg-blue-50 text-blue-600",
    Hackathon: "bg-purple-50 text-purple-600",
    Competition: "bg-amber-50 text-amber-600",
    Project: "bg-green-50 text-green-600",
    Volunteer: "bg-rose-50 text-rose-600",
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="Opportunities Explorer" subtitle="Find internships, hackathons, projects, and competitions worldwide" icon={Briefcase} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchOpportunities()}
          placeholder="Search by interest, e.g. 'AI', 'climate tech', 'fashion design'..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pick Interests</p>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selected.includes(tag) ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${typeFilter === t ? "bg-foreground text-background" : "bg-secondary"}`}>
            {t}
          </button>
        ))}
      </div>

      <button onClick={fetchOpportunities} disabled={(selected.length === 0 && !search.trim()) || loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
        Find Opportunities
      </button>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && <LoadingGrid text="Searching global opportunities..." />}

      {!loading && results && results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} opportunities found</p>
          {results.map((opp, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${typeColor[opp.type] || "bg-secondary text-foreground"}`}>{opp.type || "Opportunity"}</span>
                    {opp.is_free && <span className="text-[11px] font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-md">FREE</span>}
                  </div>
                  <h3 className="font-heading font-bold text-base">{opp.opportunity_name || "Opportunity"}</h3>
                  <p className="text-xs text-muted-foreground">{opp.organization || ""}</p>
                </div>
                {opp.relevance_score && (
                  <div className="shrink-0 text-center">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{opp.relevance_score}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Match</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{opp.description || ""}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {opp.duration && <span className="flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-md"><Clock className="h-3 w-3" />{opp.duration}</span>}
                {opp.location && <span className="flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-md"><MapPin className="h-3 w-3" />{opp.location}</span>}
                {opp.stipend && <span className="flex items-center gap-1 bg-accent/10 text-accent px-2.5 py-1 rounded-md">{opp.stipend}</span>}
              </div>
              {opp.required_skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {opp.required_skills.map((s, j) => <span key={j} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md">{s}</span>)}
                </div>
              )}
              {opp.how_to_apply && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2"><span className="font-semibold">How to apply:</span> {opp.how_to_apply}</p>
              )}
            </motion.div>
          ))}
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