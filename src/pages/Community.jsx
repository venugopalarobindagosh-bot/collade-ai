import { useState, useEffect } from "react";
import { Users, Send, Loader2, ThumbsUp, Sparkles } from "lucide-react";
import PostReplies from "../components/PostReplies";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { entities } from "@/api/entities";
import { invokeLLMStream } from "@/api/llm";
import { supabase } from "@/api/supabaseClient";
import SectionHeader from "../components/SectionHeader";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import PullToRefresh from "../components/PullToRefresh";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOPICS = ["General", "Engineering", "Medicine", "Design", "Business", "Law", "Arts", "Technology", "Abroad Studies"];

const COMMUNITY_PROMPT = (question) => `You are PathFinder AI, a friendly career mentor for students.

Answer this question clearly and helpfully:

"${question}"

Structure:
1. Direct answer (1-2 sentences)
2. Key points (3-4 bullets with specifics — salary, education, skills)
3. Actionable next step (1 sentence)

RULES:
- Keep it under 200 words
- Use markdown (## headings, bullets, **bold**)
- Be encouraging and specific
- No fluff, no "it depends"`;

export default function Community() {
  const { deductCredit } = useCredits();
  const [posts, setPosts] = useState([]);
  const [question, setQuestion] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [topic, setTopic] = useState("General");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [aiLoading, setAiLoading] = useState(null);
  const [error, setError] = useState(null);

  const loadPosts = () =>
    entities.MentorPost.list("-created_date", 20).then(data => setPosts(data || []));

  useEffect(() => { loadPosts(); }, []);

  const submitQuestion = async () => {
    if (!question.trim()) return;

    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setError(null);
    setStreamingText("");

    const askedQuestion = question.trim();

    try {
      // 1. Create the post immediately (without AI answer yet)
      const created = await entities.MentorPost.create({
        question: askedQuestion,
        author_name: authorName.trim() || "Anonymous Student",
        topic,
        likes: 0,
      });

      // 2. Show the post with streaming answer in real-time
      setPosts(prev => [{ ...created, ai_answer: "" }, ...prev]);
      setQuestion("");

      // 3. Stream the AI answer
      let fullAnswer = "";
      await invokeLLMStream({
        prompt: COMMUNITY_PROMPT(askedQuestion),
        onToken: (text) => {
          fullAnswer += text;
          setStreamingText(fullAnswer);
        },
        onDone: async (finalText) => {
          const answerText = finalText || fullAnswer;
          try {
            const updated = await entities.MentorPost.update(created.id, { ai_answer: answerText });
            setPosts(prev => prev.map(p => p.id === created.id ? updated : p));

            // Fire-and-forget spam check
            (async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;
                await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-content`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      postId: created.id,
                      table: 'mentor_post',
                      text: askedQuestion,
                    }),
                  }
                );
              } catch (modErr) {
                console.error('[Community] Moderation failed:', modErr);
              }
            })();
          } catch (saveErr) {
            console.error('[Community] Save AI answer failed:', saveErr);
          } finally {
            setStreamingText("");
            setLoading(false);
          }
        },
        onError: (err) => {
          console.error('[Community] Stream error:', err);
          setError(err.message || 'AI is taking too long. Please try again.');
          setStreamingText("");
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[Community] Submit error:', err);
      setError(err.message || 'Failed to submit question. Please try again.');
      setStreamingText("");
      setLoading(false);
    }
  };

  const likePost = async (post, idx) => {
    setError(null);
    try {
      const updated = await entities.MentorPost.update(post.id, { likes: (post.likes || 0) + 1 });
      setPosts(prev => prev.map((p, i) => i === idx ? updated : p));
    } catch (err) {
      console.error('[Community] Like error:', err);
      setError('Failed to like post.');
    }
  };

  const regenerateAI = async (post, idx) => {
    setAiLoading(idx);
    setError(null);

    // Clear this post's answer immediately
    setPosts(prev => prev.map((p, i) => i === idx ? { ...p, ai_answer: "" } : p));

    let fullAnswer = "";
    try {
      await invokeLLMStream({
        prompt: COMMUNITY_PROMPT(post.question),
        onToken: (text) => {
          fullAnswer += text;
          setPosts(prev => prev.map((p, i) => i === idx ? { ...p, ai_answer: fullAnswer } : p));
        },
        onDone: async (finalText) => {
          const answerText = finalText || fullAnswer;
          try {
            const updated = await entities.MentorPost.update(post.id, { ai_answer: answerText });
            setPosts(prev => prev.map((p, i) => i === idx ? updated : p));
          } catch (err) {
            console.error('[Community] Save regenerated answer failed:', err);
          }
        },
        onError: (err) => {
          console.error('[Community] Regenerate stream error:', err);
          setError('Failed to regenerate AI answer.');
        },
      });
    } catch (err) {
      console.error('[Community] Regenerate error:', err);
      setError('Failed to regenerate AI answer.');
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <PullToRefresh onRefresh={loadPosts}>
    <div className="space-y-6">
      <SectionHeader title="Community & Mentor Chat" subtitle="Ask anything — get AI answers + community wisdom" icon={Users} />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Your name (optional)"
            className="bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOPICS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
          placeholder="Ask anything — 'Should I do CS or Data Science?', 'Best countries for medical studies?', 'How do I get an internship at Google?'"
          className="w-full bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        <button onClick={submitQuestion} disabled={!question.trim() || loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? "Getting AI answer..." : "Post Question"}
        </button>
      </div>

      <div className="space-y-4">
        {posts.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">No questions yet — be the first!</p>}
        {posts.map((post, idx) => {
          // Show streaming text for the most recent post if it's currently streaming
          const isStreaming = loading && idx === 0 && streamingText;
          const answerToShow = isStreaming ? streamingText : post.ai_answer;

          return (
            <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(post.author_name || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{post.author_name || "Anonymous Student"}</p>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md">{post.topic || "General"}</span>
                    </div>
                  </div>
                  <button onClick={() => likePost(post, idx)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <ThumbsUp className="h-3.5 w-3.5" /> {post.likes || 0}
                  </button>
                </div>
                <p className="font-medium text-sm">{post.question}</p>
              </div>

              {answerToShow && (
                <div className="border-t border-border bg-gradient-to-br from-primary/5 to-accent/5 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">Collade AI</span>
                      {isStreaming && (
                        <span className="text-[10px] text-muted-foreground italic animate-pulse">
                          typing...
                        </span>
                      )}
                    </div>
                    <button onClick={() => regenerateAI(post, idx)} disabled={aiLoading === idx || isStreaming}
                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40">
                      {aiLoading === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : "↻ Refresh"}
                    </button>
                  </div>
                  <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1">
                    {answerToShow}
                  </ReactMarkdown>
                </div>
              )}

              <PostReplies postId={post.id} />
            </motion.div>
          );
        })}
      </div>
    </div>
    </PullToRefresh>
    </FeatureGate>
  );
}