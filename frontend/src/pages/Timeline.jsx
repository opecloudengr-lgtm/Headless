import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PostCard from "../components/PostCard.jsx";
import TagPicker from "../components/TagPicker.jsx";
import Spinner from "../components/Spinner.jsx";
import Alert from "../components/Alert.jsx";

export default function Timeline() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .timeline()
      .then((res) => setPosts(res.posts))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setError("");
    setPosting(true);
    try {
      const res = await api.createPost({ body: body.trim(), tagged_usernames: tags });
      setPosts((prev) => [res.post, ...prev]);
      setBody("");
      setTags([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not publish your post.");
    } finally {
      setPosting(false);
    }
  }

  function handleDeleted(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-wine-950">Timeline</h1>
        <p className="mt-1 text-wine-600">
          Ask for something, share an update, or tag a creator — separate from your media uploads.
        </p>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="card mb-8 flex flex-col gap-3 p-5">
          <Alert type="error">{error}</Alert>
          <textarea
            className="input min-h-20"
            placeholder="What's on your mind? Use @username to tag someone…"
            value={body}
            maxLength={500}
            onChange={(e) => setBody(e.target.value)}
          />
          <TagPicker value={tags} onChange={setTags} placeholder="Tag someone (optional)" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-wine-400">{body.length}/500</span>
            <button type="submit" disabled={!body.trim() || posting} className="btn-primary">
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card mb-8 flex items-center justify-between gap-4 p-5">
          <p className="text-sm text-wine-600">Log in to post, like, comment, and tag people.</p>
          <Link to="/login" className="btn-primary shrink-0">
            Log in
          </Link>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <p className="text-wine-500">No posts yet — be the first to say something.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
