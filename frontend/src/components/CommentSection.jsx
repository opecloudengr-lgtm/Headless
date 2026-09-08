import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MentionText from "./MentionText.jsx";
import Spinner from "./Spinner.jsx";

export default function CommentSection({ targetType, targetId, contentOwnerId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const fetcher = targetType === "media" ? api.mediaComments(targetId) : api.postComments(targetId);
    fetcher
      .then((res) => active && setComments(res.comments))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [targetType, targetId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const payload =
        targetType === "media"
          ? { body: body.trim(), media_item_id: targetId }
          : { body: body.trim(), post_id: targetId };
      const res = await api.createComment(payload);
      setComments((prev) => [...prev, res.comment]);
      setBody("");
    } catch {
      // no-op: leave the draft in place so the user can retry
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId) {
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // no-op
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="input"
            placeholder="Write a comment… use @username to tag someone"
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" disabled={!body.trim() || posting} className="btn-primary shrink-0">
            Post
          </button>
        </form>
      )}

      {loading ? (
        <Spinner className="py-4" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-wine-400">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => {
            const canDelete =
              user && (user.id === c.author.id || user.id === contentOwnerId || user.is_admin);

            return (
              <li key={c.id} className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wine-100 text-xs font-bold text-wine-700">
                  {c.author.username?.[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 rounded-2xl bg-wine-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/profile/${c.author.id}`} className="text-sm font-semibold text-wine-900 hover:underline">
                      {c.author.username}
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs font-semibold text-wine-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <MentionText text={c.body} className="text-sm text-wine-700" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
