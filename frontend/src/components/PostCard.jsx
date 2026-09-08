import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MentionText from "./MentionText.jsx";
import ReportButton from "./ReportButton.jsx";
import CommentSection from "./CommentSection.jsx";

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const units = [
    ["y", 31536000],
    ["mo", 2592000],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];
  for (const [label, secs] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label}`;
  }
  return "now";
}

export default function PostCard({ post, onDeleted, defaultShowComments = false }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [saved, setSaved] = useState(post.saved_by_me);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [busy, setBusy] = useState(false);

  const canDelete = user && (user.id === post.author.id || user.is_admin);

  async function handleLike() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const res = await api.togglePostLike(post.id);
      setLiked((v) => !v);
      setLikesCount(res.likes_count);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const res = await api.toggleSave("post", post.id);
      setSaved(res.saved);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this post?")) return;
    await api.deletePost(post.id);
    onDeleted?.(post.id);
  }

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Link
            to={`/profile/${post.author.id}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wine-gradient text-sm font-bold text-white"
          >
            {post.author.username?.[0]?.toUpperCase()}
          </Link>
          <div>
            <Link to={`/profile/${post.author.id}`} className="font-semibold text-wine-900 hover:underline">
              {post.author.username}
            </Link>
            <Link to={`/posts/${post.id}`} className="text-xs text-wine-400 hover:underline">
              {timeAgo(post.created_at)} ago
            </Link>
          </div>
        </div>
        <ReportButton itemType="post" itemId={post.id} />
      </div>

      <MentionText text={post.body} taggedUsers={post.tagged_users} className="mt-3 block whitespace-pre-wrap text-wine-800" />

      {post.tagged_users?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.tagged_users.map((u) => (
            <Link
              key={u.id}
              to={`/profile/${u.id}`}
              className="badge bg-wine-50 text-wine-600 hover:bg-wine-100"
            >
              @{u.username}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-wine-100 pt-3 text-sm">
        <button
          onClick={handleLike}
          disabled={!user}
          className={`flex items-center gap-1.5 font-semibold ${liked ? "text-wine-700" : "text-wine-400 hover:text-wine-600"}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 20.5s-7.5-4.6-10-9.2C.5 8 2 4.5 5.5 4c2-.3 3.8.7 6.5 3 2.7-2.3 4.5-3.3 6.5-3 3.5.5 5 4 3.5 7.3-2.5 4.6-10 9.2-10 9.2Z" />
          </svg>
          {likesCount}
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 font-semibold text-wine-400 hover:text-wine-600"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-1L3 20l1.1-4.2a8.4 8.4 0 0 1-1.1-4A8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
          </svg>
          {post.comments_count}
        </button>

        <button
          onClick={handleSave}
          disabled={!user}
          className={`ml-auto flex items-center gap-1.5 font-semibold ${saved ? "text-gold-600" : "text-wine-400 hover:text-wine-600"}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M6 3.5h12a.5.5 0 0 1 .5.5v17l-6.5-4-6.5 4v-17a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
          </svg>
          Save
        </button>

        {canDelete && (
          <button onClick={handleDelete} className="font-semibold text-wine-400 hover:text-red-600">
            Delete
          </button>
        )}
      </div>

      {showComments && (
        <div className="mt-4 border-t border-wine-100 pt-4">
          <CommentSection targetType="post" targetId={post.id} contentOwnerId={post.author.id} />
        </div>
      )}
    </article>
  );
}
