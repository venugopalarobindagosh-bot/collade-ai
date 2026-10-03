import { useState, useRef } from "react";
import { Briefcase, Search, Loader2, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

const INTEREST_TAGS = [
  "Robotics", "AI / Machine Learning", "Web Development", "Design", "Finance",
  "Healthcare", "Environment", "Gaming", "Music", "Writing", "Space", "Biotech"
];

const TYPE_FILTERS = ["All", "Internship", "Hackathon", "Competition", "Project", "Volunteer"];

export default function Opportunities() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

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
    setStreamedText("");
    setParsedItems([]);
    setError(null);

    const prompt = `You are Collade AI, an expert opportunity finder for students.

For a student interested in: ${query}
Type filter: ${typeFilter === "All" ? "any type" : typeFilter}

Write a HIGHLY DETAILED guide about opportunities in this space, then list 12 clickable opportunity cards.

=== PART 1: DETAILED GUIDE ===

Write 3-4 paragraphs covering:
- Landscape of opportunities available for students in this space
- Why these matter for building a career
- Best time to apply (specific months) and how competitive they are
- What separates accepted applicants from rejected ones

Then 6-8 "Types of Opportunities" bullets with real examples of each.

Then 5-6 "Winning Strategies" bullets from real students who got selected.

Then 4-5 "Application Timeline" bullets with specific months.

Then 4 "Free vs Paid Programs" bullets — best free options.

=== PART 2: OPPORTUNITY CARDS ===

After the guide, write EXACTLY this marker on its own line:

[ OPPORTUNITY CARDS ]

Then list 12 real opportunities, EACH in this EXACT format (no #, no **, no bullets):

Opportunity Name Here
Organization: Real organization name
Type: Internship/Hackathon/Competition/Project/Volunteer
Duration: X weeks/months · Location: City/Country/Remote
Cost: FREE or ₹X fee · Stipend: Amount or Unpaid
Eligibility: Who can apply
[2-3 sentence description of what it involves and why it matters]

(blank line between each opportunity)

RULES:
- Use REAL opportunities that exist (Google Science Fair, Microsoft Imagine Cup, etc.)
- REAL organizations, REAL deadlines, REAL costs
- NEVER invent fake programs
- Plain text format, no markdown symbols
- Use [ OPPORTUNITY CARDS ] as the exact marker`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          if (buffer.includes("[ OPPORTUNITY CARDS ]")) {
            const items = extractOpportunitiesFromMarker(buffer);
            if (items.length > 0) setParsedItems(items);
          }
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        },
        onDone: () => setLoading(false),
        onError: (err) => {
          console.error('[Opportunities] Error:', err);
          setError(err.message || 'Failed to find opportunities.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[Opportunities] Catch error:', err);
      setError(err.message || 'Failed to find opportunities.');
      setLoading(false);
    }
  };

  const openOpportunityDetail = (name) => {
    navigate(`/career-detail?name=${encodeURIComponent(name)}&stream=${encodeURIComponent("Opportunities")}`);
  };

  const guideText = streamedText.split("[ OPPORTUNITY CARDS ]")[0] || "";

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

      {loading && !streamedText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-heading font-semibold text-primary">🔍 Finding opportunities...</p>
          </div>
        </motion.div>
      )}

      {guideText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-6 sm:p-8"
        >
          <SmartMarkdown text={guideText} />
          {loading && !streamedText.includes("[ OPPORTUNITY CARDS ]") && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground italic">writing...</span>
            </div>
          )}
        </motion.div>
      )}

      {parsedItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              🎯 {parsedItems.length} opportunities to apply for
              {loading && <span className="text-primary italic"> (streaming...)</span>}
            </p>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {parsedItems.map((opp, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => openOpportunityDetail(opp.name)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors">{opp.name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                </div>
                <div className="space-y-1.5 text-xs">
                  {opp.organization && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">By:</span> {opp.organization}</p>
                  )}
                  {opp.type && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Type:</span> {opp.type}</p>
                  )}
                  {opp.duration && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Duration:</span> {opp.duration}</p>
                  )}
                  {opp.cost && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Cost:</span> {opp.cost}</p>
                  )}
                  {opp.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {opp.tags.map((tag, j) => (
                        <span key={j} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                  {opp.description && (
                    <p className="text-muted-foreground line-clamp-2 pt-1">{opp.description}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}

function extractOpportunitiesFromMarker(text) {
  const markerIdx = text.indexOf("[ OPPORTUNITY CARDS ]");
  if (markerIdx === -1) return [];
  const block = text.slice(markerIdx + "[ OPPORTUNITY CARDS ]".length);
  const lines = block.split("\n").map(l => l.trim());
  const items = [];
  let current = null;
  let paragraphs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const isKey = /^(Organization|Type|Duration|Location|Cost|Stipend|Eligibility)\s*:/i.test(line);
    const isBullet = line.startsWith("-") || line.startsWith("•") || /^\d+\./.test(line);

    if (!isKey && !isBullet && line.length < 80 && !line.endsWith(".")) {
      if (current && (current.organization || current.type)) {
        current.description = paragraphs.join(" ").trim();
        items.push(current);
      }
      current = { name: line, organization: "", type: "", duration: "", cost: "", tags: [], description: "" };
      paragraphs = [];
      continue;
    }
    if (!current) continue;

    const orgMatch = line.match(/^Organization:\s*(.+)/i);
    if (orgMatch) { current.organization = orgMatch[1].trim(); continue; }

    const typeMatch = line.match(/^Type:\s*(.+)/i);
    if (typeMatch) { current.type = typeMatch[1].trim(); continue; }

    const durationMatch = line.match(/^Duration:\s*([^·]+?)(?:\s*·\s*Location:\s*(.+))?$/i);
    if (durationMatch) {
      current.duration = durationMatch[1].trim();
      if (durationMatch[2]) current.tags.push("📍 " + durationMatch[2].trim());
      continue;
    }

    const costMatch = line.match(/^Cost:\s*([^·]+?)(?:\s*·\s*Stipend:\s*(.+))?$/i);
    if (costMatch) {
      current.cost = costMatch[1].trim();
      if (costMatch[2]) current.tags.push("💵 " + costMatch[2].trim());
      continue;
    }

    const stipendMatch = line.match(/^Stipend:\s*(.+)/i);
    if (stipendMatch) { current.tags.push("💵 " + stipendMatch[1].trim()); continue; }

    const eligMatch = line.match(/^Eligibility:\s*(.+)/i);
    if (eligMatch) { current.tags.push("🎯 " + eligMatch[1].trim()); continue; }

    paragraphs.push(line);
  }

  if (current && (current.organization || current.type)) {
    current.description = paragraphs.join(" ").trim();
    items.push(current);
  }
  return items;
}