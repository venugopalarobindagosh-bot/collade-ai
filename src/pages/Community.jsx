import { useState, useEffect } from "react";
import { Users, Send, Loader2, ThumbsUp, MessageCircle, Sparkles } from "lucide-react";
import PostReplies from "../components/PostReplies";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { entities } from "@/api/entities";
import { invokeLLM } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import PullToRefresh from "../components/PullToRefresh";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOPICS = ["General", "Engineering", "Medicine", "Design", "Business", "Law", "Arts", "Technology", "Abroad Studies"];

export default function Community() {
  const { deductCredit } = useCredits();
  const [posts, setPosts] = useState([]);
  const [question, setQuestion] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [topic, setTopic] = useState("General");
  const [loading, setLoading] = useState(false);
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
    
    try {
      const prompt = `You are PathFinder AI, a friendly and expert career guidance assistant for high school and college students. Answer this question in a helpful, encouraging, and detailed way:

"${question.trim()}"

Use markdown for formatting. Be conversational and teen-friendly.`;

      const [created, aiRes] = await Promise.all([
        entities.MentorPost.create({
          question: question.trim(),
          author_name: authorName.trim() || "Anonymous Student",
          topic,
          likes: 0
        }),
        invokeLLM({
          prompt: prompt,
          query: prompt
        })
      ]);

      console.log('[Community] AI Response:', aiRes);

      const updated = await entities.MentorPost.update(created.id, { ai_answer: aiRes });
      setPosts(prev => [updated, ...prev]);
      setQuestion("");

    } catch (err) {
      console.error('[Community] Submit error:', err);
      setError(err.message || 'Failed to submit question. Please try again.');
    } finally { 
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
    try {
      const prompt = `As PathFinder AI career guide, answer this question for a student:

"${post.question}"

Use markdown formatting. Be detailed and encouraging.`;

      const aiRes = await invokeLLM({
        prompt: prompt,
        query: prompt
      });

      console.log('[Community] Regenerated AI:', aiRes);

      const updated = await entities.MentorPost.update(post.id, { ai_answer: aiRes });
      setPosts(prev => prev.map((p, i) => i === idx ? updated : p));
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

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Ask form */}
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

      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">No questions yet — be the first!</p>}
        {posts.map((post, idx) => (
          <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
            className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Question */}
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

            {/* AI Answer */}
            {post.ai_answer && (
              <div className="border-t border-border bg-gradient-to-br from-primary/5 to-accent/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Collade AI</span>
                  </div>
                  <button onClick={() => regenerateAI(post, idx)} disabled={aiLoading === idx}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
                    {aiLoading === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : "↻ Refresh"}
                  </button>
                </div>
                <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1">
                  {post.ai_answer}
                </ReactMarkdown>
              </div>
            )}

            {/* Community Replies */}
            <PostReplies postId={post.id} />
          </motion.div>
        ))}
      </div>
    </div>
    </PullToRefresh>
    </FeatureGate>
  );
}