import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { invokeLLMStream } from "@/api/llm";
import { motion } from "framer-motion";

export default function CareerDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const name = urlParams.get("name") || "";
  const stream = urlParams.get("stream") || "";
  const level = urlParams.get("level") || "";

  const [streamedText, setStreamedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!name) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      setStreamedText("");

      const prompt = `You are Collade AI, an expert career guide.

Give a hyper-detailed career guide for: "${name}"
${stream ? `Stream: ${stream}` : ""}
${level ? `Level: ${level}` : ""}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

# [Full Career Title]

[2-3 sentence quick summary — what this career is about]

## 📋 Overview
[3-4 sentence overview of what this career involves day-to-day]

## 🎓 Education Path
- **Required Degree:** [specific degree name] — [duration]
- **Top Universities (India):** [5 specific universities]
- **Top Universities (Global):** [5 specific universities]
- **Entrance Exams:** [specific real exams]
- **Required Subjects:** [specific subjects]

## 💰 Salary Guide
- **India (Entry):** ₹X-Y LPA
- **India (Mid):** ₹X-Y LPA
- **India (Senior):** ₹X-Y LPA
- **Global (Entry):** $X-Y USD
- **Global (Senior):** $X-Y USD

## ⚡ AI Impact
[2-3 sentences on how AI affects this career + % risk score]

## 📈 Growth & Outlook
- **5-year outlook:** [specific growth % or qualitative answer]
- **10-year outlook:** [specific prediction]
- **Best locations:** [specific cities/countries]

## 🎯 Skills You Need
- **[Skill 1]** — why + how to learn
- **[Skill 2]**
(6-8 skills, mix of technical + soft)

## 💼 Career Options
- [Specific job title 1]
- [Specific job title 2]
(5-6 titles)

## 🌅 A Day in the Life
[3-4 sentence vivid description of a typical workday]

## ✅ Pros
- [Specific pro 1]
- [Specific pro 2]
(4-5 items)

## ⚠️ Cons
- [Specific con 1]
- [Specific con 2]
(3-4 items)

## 🚀 Next Steps for Students
1. [Specific action]
2. [Specific action]
3. [Specific action]

RULES:
- Use REAL numbers, REAL universities, REAL company names
- NEVER say "varies" — give specific ranges
- Use Indian context where relevant
- Keep under 800 words
- Use emojis for sections
- Bold all key terms
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
            console.error('[CareerDetail] Error:', err);
            setError(err.message || 'Failed to load career details.');
            setLoading(false);
          },
        });
      } catch (err) {
        console.error('[CareerDetail] Catch error:', err);
        setError(err.message || 'Failed to load career details.');
        setLoading(false);
      }
    };

    fetchDetail();
  }, [name, stream, level]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && !streamedText && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-heading font-semibold text-primary">💭 Writing your career guide...</p>
          <p className="text-xs text-muted-foreground">Loading details for {name}</p>
        </div>
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
  );
}