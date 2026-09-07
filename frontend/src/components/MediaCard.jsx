import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CategoryTile } from "./CategoryIcon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

export default function MediaCard({ item, onLikeToggle }) {
  const { user } = useAuth();
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(item.liked_by_me);
  const [likesCount, setLikesCount] = useState(item.likes_count);

  async function handleLike(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || liking) return;
    setLiking(true);
    try {
      const res = await api.toggleLike(item.id);
      setLiked((prev) => !prev);
      setLikesCount(res.likes_count);
      onLikeToggle?.(item.id, res.likes_count);
    } catch {
      // no-op: transient failure, UI stays consistent with last known state
    } finally {
      setLiking(false);
    }
  }

  return (
    <Link
      to={`/media/${item.id}`}
      state={{ item }}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-wine"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <CategoryTile category={item.category} className="h-full w-full" />
        {item.is_featured && (
          <span className="badge absolute left-3 top-3 bg-gold-500 text-wine-950">
            ★ Featured
          </span>
        )}
        <span className="badge absolute right-3 top-3 bg-white/90 text-wine-800">
          {item.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-display text-lg font-bold text-wine-950">
          {item.title}
        </h3>
        {item.description && (
          <p className="line-clamp-2 text-sm text-wine-700/80">{item.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 text-sm text-wine-600">
          <span className="truncate">
            by{" "}
            <span className="font-semibold text-wine-800">
              {item.uploader?.username || "Unknown"}
            </span>
          </span>

          <button
            onClick={handleLike}
            disabled={!user || liking}
            title={user ? "Like" : "Log in to like"}
            className={`flex items-center gap-1 rounded-full px-2 py-1 transition ${
              liked ? "text-wine-700" : "text-wine-400 hover:text-wine-600"
            } disabled:cursor-not-allowed`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M12 20.5s-7.5-4.6-10-9.2C.5 8 2 4.5 5.5 4c2-.3 3.8.7 6.5 3 2.7-2.3 4.5-3.3 6.5-3 3.5.5 5 4 3.5 7.3-2.5 4.6-10 9.2-10 9.2Z" />
            </svg>
            <span className="text-xs font-semibold">{likesCount}</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
