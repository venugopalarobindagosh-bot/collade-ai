import { useState, useEffect } from "react";
import { Shield, Trash2, Ban, Loader2, AlertTriangle, Search } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { getCurrentUser } from "@/lib/auth";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [banned, setBanned] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await getCurrentUser();
      if (!me?.id) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", me.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await Promise.all([loadPosts(), loadBans()]);
      setLoading(false);
    })();
  }, []);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("mentor_post")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setPosts(data || []);
  };

  const loadBans = async () => {
    const { data } = await supabase
      .from("user_bans")
      .select("*")
      .order("created_at", { ascending: false });
    setBanned(data || []);
  };

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
  };

  const deletePost = async (post) => {
    if (!confirm(`Delete this post permanently?\n\n"${post.question.slice(0, 100)}..."`)) return;
    setActionLoading(`post-${post.id}`);
    try {
      await supabase.from("post_reply").delete().eq("post_id", post.id);
      const { error } = await supabase.from("mentor_post").delete().eq("id", post.id);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== post.id));
      flash("Post deleted");
    } catch (err) {
      console.error("[Admin] Delete post error:", err);
      flash("Failed to delete post", true);
    } finally {
      setActionLoading(null);
    }
  };

  const banUser = async (post) => {
    const reason = prompt("Ban reason (user will see this if we add it later):");
    if (!reason) return;

    const days = prompt("Ban duration in days (leave empty for permanent):");
    const expires_at = days ? new Date(Date.now() + parseInt(days) * 86400000).toISOString() : null;

    setActionLoading(`ban-${post.user_id}`);
    try {
      const { error } = await supabase.from("user_bans").insert({
        user_id: post.user_id,
        reason,
        expires_at,
      });
      if (error) throw error;
      await loadBans();
      flash(`User banned${days ? ` for ${days} days` : " permanently"}`);
    } catch (err) {
      console.error("[Admin] Ban error:", err);
      flash("Failed to ban user (may already be banned)", true);
    } finally {
      setActionLoading(null);
    }
  };

  const unbanUser = async (ban) => {
    if (!confirm("Unban this user?")) return;
    setActionLoading(`unban-${ban.user_id}`);
    try {
      const { error } = await supabase.from("user_bans").delete().eq("user_id", ban.user_id);
      if (error) throw error;
      await loadBans();
      flash("User unbanned");
    } catch (err) {
      console.error("[Admin] Unban error:", err);
      flash("Failed to unban", true);
    } finally {
      setActionLoading(null);
    }
  };

  // Flagged posts (auto-moderated by AI)
  const flaggedPosts = posts.filter(p => p.auto_flagged);

  // Visible posts (hide flagged ones from main list)
  const filteredPosts = posts
    .filter(p => !p.auto_flagged)
    .filter(p =>
      !search || p.question?.toLowerCase().includes(search.toLowerCase()) ||
      p.author_name?.toLowerCase().includes(search.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Admin Panel"
        subtitle="Moderate community — delete spam, ban bad actors"
        icon={Shield}
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700">
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Posts</p>
          <p className="font-heading text-2xl font-bold mt-1">{posts.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Auto-Flagged</p>
          <p className="font-heading text-2xl font-bold mt-1 text-destructive">{flaggedPosts.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Banned Users</p>
          <p className="font-heading text-2xl font-bold mt-1 text-destructive">{banned.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search posts by text or author..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* AUTO-FLAGGED POSTS — Step 5 */}
      {flaggedPosts.length > 0 && (
        <div className="bg-destructive/5 border-2 border-destructive/30 rounded-xl p-4">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3 flex items-center gap-2">
            🚨 Auto-Flagged Posts ({flaggedPosts.length})
          </p>
          <div className="space-y-2">
            {flaggedPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg p-3 flex items-start justify-between gap-3 border border-destructive/20">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-destructive font-semibold">
                    {post.flag_reason || "Flagged by AI"}
                  </p>
                  <p className="text-sm mt-1">{post.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {post.author_name || "Anonymous"} • {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => deletePost(post)}
                    disabled={actionLoading === `post-${post.id}`}
                    className="text-xs px-2.5 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 font-medium"
                  >
                    {actionLoading === `post-${post.id}` ? "..." : "Delete"}
                  </button>
                  {post.user_id && (
                    <button
                      onClick={() => banUser(post)}
                      disabled={actionLoading === `ban-${post.user_id}`}
                      className="text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/70 font-medium"
                    >
                      {actionLoading === `ban-${post.user_id}` ? "..." : "Ban"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banned users list */}
      {banned.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">
            Banned Users ({banned.length})
          </p>
          <div className="space-y-2">
            {banned.map(b => (
              <div key={b.user_id} className="flex items-center justify-between gap-3 bg-white rounded-lg p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-muted-foreground truncate">{b.user_id}</p>
                  <p className="text-sm font-medium">{b.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.expires_at ? `Expires: ${new Date(b.expires_at).toLocaleDateString()}` : "Permanent"}
                  </p>
                </div>
                <button
                  onClick={() => unbanUser(b)}
                  disabled={actionLoading === `unban-${b.user_id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors"
                >
                  {actionLoading === `unban-${b.user_id}` ? "..." : "Unban"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts list (no flagged ones) */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          All Posts ({filteredPosts.length})
        </p>
        {filteredPosts.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">No posts match your search.</p>
        )}
        {filteredPosts.map((post, idx) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold">{post.author_name || "Anonymous"}</span>
                  <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md">{post.topic || "General"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(post.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{post.question}</p>
                {post.ai_answer && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    AI: {post.ai_answer.slice(0, 150)}...
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => deletePost(post)}
                  disabled={actionLoading === `post-${post.id}`}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  {actionLoading === `post-${post.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Delete
                </button>
                {post.user_id && (
                  <button
                    onClick={() => banUser(post)}
                    disabled={actionLoading === `ban-${post.user_id}`}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors"
                  >
                    {actionLoading === `ban-${post.user_id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                    Ban User
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}