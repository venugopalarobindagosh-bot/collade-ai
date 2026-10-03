import { useState, useRef } from "react";
import { Cpu, Plus, X, Loader2, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SmartMarkdown from "../components/SmartMarkdown";

export default function CareerSimulator() {
  const { deductCredit } = useCredits();
  const navigate = useNavigate();
  const [degree, setDegree] = useState("");
  const [internships, setInternships] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [internInput, setInternInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const addItem = (val, list, setList, setInput) => {
    if (!val.trim() || list.includes(val.trim())) return;
    setList([...list, val.trim()]);
    setInput("");
  };

  const simulate = async () => {
    if (!degree.trim()) return;

    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setStreamedText("");
    setParsedItems([]);
    setError(null);

    const prompt = `You are Collade AI, an expert career trajectory simulator.

Simulate a detailed 10-year career outlook for a student with:
- Degree: ${degree}
- Internships/Experience: ${internships.join(", ") || "None yet"}
- Certifications: ${certifications.join(", ") || "None yet"}

=== PART 1: DETAILED SIMULATION ===

Write 4-5 paragraphs covering:
- Year 1 trajectory — first job, expected salary, common employers
- Year 3 trajectory — mid-level growth, skills to build, salary progression
- Year 5 trajectory — specialization, leadership opportunities, realistic salary
- Year 10 trajectory — senior roles, top salary potential, geography
- Overall risk assessment — how AI affects this path in the next decade

Then 6-8 "Key Milestones" bullets with specific years and salaries.

Then 5 "Skills to Accelerate Growth" bullets with reasoning.

Then 5 "Biggest Risks & How to Avoid Them" bullets.

Then 4 "Best Locations" bullets with specific cities/countries.

=== PART 2: CAREER CARDS ===

After the guide, write EXACTLY this marker on its own line:

[ CAREER CARDS ]

Then list 12 roles this student could target at different career stages, EACH in this EXACT format (no #, no **, no bullets):

Role Title Here
Stream: Specific field
Duration: X years · Level: Undergraduate/Postgraduate/Certification
Salary: ₹X-Y LPA (India) | $X-Y USD (Global)
AI Impact: Low/Medium/High · Growth: High/Medium
[2-3 sentence description of the role and when in the trajectory it fits]

(blank line between each role)

RULES:
- REAL numbers, REAL companies, REAL salaries with currency
- NEVER say "varies" — give specific ranges
- Be brutally honest about AI risks
- Use Indian context where relevant
- Plain text format, no markdown symbols
- Use [ CAREER CARDS ] as the exact marker`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
          if (buffer.includes("[ CAREER CARDS ]")) {
            const items = extractCareersFromMarker(buffer);
            if (items.length > 0) setParsedItems(items);
          }
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        },
        onDone: () => setLoading(false),
        onError: (err) => {
          console.error('[CareerSimulator] Error:', err);
          setError(err.message || 'Failed to simulate career. Please try again.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[CareerSimulator] Catch error:', err);
      setError(err.message || 'Failed to simulate career.');
      setLoading(false);
    }
  };

  const openCareerDetail = (careerName) => {
    navigate(`/career-detail?name=${encodeURIComponent(careerName)}&stream=${encodeURIComponent(degree)}`);
  };

  const guideText = streamedText.split("[ CAREER CARDS ]")[0] || "";

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader
        title="Career Simulator"
        subtitle="Simulate your 5–10 year career outlook based on your degree + experience"
        icon={Cpu}
      />

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Degree / Field</label>
          <input
            value={degree}
            onChange={e => setDegree(e.target.value)}
            placeholder="e.g., B.Tech Computer Science, MBBS, MBA Finance..."
            className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internships / Work Experience</label>
          <div className="flex gap-2 mt-1.5">
            <input
              value={internInput}
              onChange={e => setInternInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem(internInput, internships, setInternships, setInternInput)}
              placeholder="e.g., Google SWE Intern, Hospital Shadowing..."
              className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => addItem(internInput, internships, setInternships, setInternInput)}
              className="px-3 bg-primary text-primary-foreground rounded-lg"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {internships.map((i, idx) => (
              <span key={idx} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                {i}
                <button onClick={() => setInternships(prev => prev.filter((_, j) => j !== idx))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certifications</label>
          <div className="flex gap-2 mt-1.5">
            <input
              value={certInput}
              onChange={e => setCertInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem(certInput, certifications, setCertifications, setCertInput)}
              placeholder="e.g., AWS Cloud, CFA Level 1..."
              className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => addItem(certInput, certifications, setCertifications, setCertInput)}
              className="px-3 bg-primary text-primary-foreground rounded-lg"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {certifications.map((c, idx) => (
              <span key={idx} className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md">
                {c}
                <button onClick={() => setCertifications(prev => prev.filter((_, j) => j !== idx))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={simulate}
          disabled={!degree.trim() || loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20 hover:opacity-90"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
          Run Simulation
        </button>
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
            <p className="font-heading font-semibold text-primary">⚡ Simulating your 10-year trajectory...</p>
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
          {loading && !streamedText.includes("[ CAREER CARDS ]") && (
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
              🎯 {parsedItems.length} roles you could target
              {loading && <span className="text-primary italic"> (streaming...)</span>}
            </p>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {parsedItems.map((career, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => openCareerDetail(career.name)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors">{career.name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                </div>
                <div className="space-y-1.5 text-xs">
                  {career.duration && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Duration:</span> {career.duration}</p>
                  )}
                  {career.salary && (
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Salary:</span> {career.salary}</p>
                  )}
                  {career.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {career.tags.map((tag, j) => (
                        <span key={j} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                  {career.description && (
                    <p className="text-muted-foreground line-clamp-2 pt-1">{career.description}</p>
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

function extractCareersFromMarker(text) {
  const markerIdx = text.indexOf("[ CAREER CARDS ]");
  if (markerIdx === -1) return [];
  const block = text.slice(markerIdx + "[ CAREER CARDS ]".length);
  const lines = block.split("\n").map(l => l.trim());
  const items = [];
  let current = null;
  let paragraphs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const isKey = /^(Stream|Duration|Salary|AI Impact|Level)\s*:/i.test(line);
    const isBullet = line.startsWith("-") || line.startsWith("•") || /^\d+\./.test(line);

    if (!isKey && !isBullet && line.length < 80 && !line.endsWith(".")) {
      if (current && (current.salary || current.duration)) {
        current.description = paragraphs.join(" ").trim();
        items.push(current);
      }
      current = { name: line, duration: "", salary: "", tags: [], description: "" };
      paragraphs = [];
      continue;
    }
    if (!current) continue;

    const streamMatch = line.match(/^Stream:\s*(.+)/i);
    if (streamMatch) { current.tags.push(streamMatch[1].trim()); continue; }

    const durationMatch = line.match(/^Duration:\s*([^·]+?)(?:\s*·\s*Level:\s*(.+))?$/i);
    if (durationMatch) {
      current.duration = durationMatch[1].trim();
      if (durationMatch[2]) current.tags.push(durationMatch[2].trim());
      continue;
    }
    const salaryMatch = line.match(/^Salary:\s*(.+)/i);
    if (salaryMatch) { current.salary = salaryMatch[1].trim(); continue; }

    const aiMatch = line.match(/^AI Impact:\s*([^·]+?)(?:\s*·\s*Growth:\s*(.+))?$/i);
    if (aiMatch) {
      current.tags.push("AI: " + aiMatch[1].trim());
      if (aiMatch[2]) current.tags.push("Growth: " + aiMatch[2].trim());
      continue;
    }
    paragraphs.push(line);
  }

  if (current && (current.salary || current.duration)) {
    current.description = paragraphs.join(" ").trim();
    items.push(current);
  }
  return items;
}