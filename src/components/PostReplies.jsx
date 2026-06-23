import { useState, useEffect } from "react";
import { Send, ThumbsUp, MessageCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { entities } from "@/api/entities";
import { motion, AnimatePresence } from "framer-motion";

export default function PostReplies({ postId }) {
  const [replies, setReplies] = useState([]);
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadReplies = async () => {
    const data = await entities.PostReply.filter({ post_id: postId }, "-created_date", 50);
    setReplies(data || []);
    setLoaded(true);
  };

  const toggle = () => {
    if (!open && !loaded) loadReplies();
    setOpen(v => !v);
  };

  const submit = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    const created = await entities.PostReply.create({
      post_id: postId,
      author_name: authorName.trim() || "Anonymous Student",
      content: replyText.trim(),
      likes: 0,
    });
    setReplies(prev => [...prev, created]);
    setReplyText("");
    setSubmitting(false);
  };

  const likeReply = async (reply, idx) => {
    const updated = await entities.PostReply.update(reply.id, { likes: (reply.likes || 0) + 1 });
    setReplies(prev => prev.map((r, i) => i === idx ? updated : r));
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={toggle}
        className="flex items-center gap-2 w-full px-5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {replies.length > 0 ? `${replies.length} community repl${replies.length === 1 ? "y" : "ies"}` : "Reply from community"}
        {open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-3">
              {/* Existing replies */}
              {replies.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-2">No replies yet — share your thoughts!</p>
              )}
              {replies.map((reply, idx) => (
                <div key={reply.id} className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {(reply.author_name || "A")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{reply.author_name || "Anonymous Student"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                    <button
                      onClick={() => likeReply(reply, idx)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary mt-1 transition-colors"
                    >
                      <ThumbsUp className="h-3 w-3" /> {reply.likes || 0}
                    </button>
                  </div>
                </div>
              ))}

              {/* Reply input */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <input
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="Share your experience or advice..."
                    className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <button
                    onClick={submit}
                    disabled={!replyText.trim() || submitting}
                    className="self-end h-9 w-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}