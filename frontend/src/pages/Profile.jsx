import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Alert from "../components/Alert.jsx";
import Spinner from "../components/Spinner.jsx";
import MediaCard from "../components/MediaCard.jsx";
import PostCard from "../components/PostCard.jsx";

const TABS = [
  { key: "uploads", label: "My Uploads" },
  { key: "saved", label: "Saved" },
  { key: "tagged", label: "Tagged In" },
];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ username: user?.username || "", email: user?.email || "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState("uploads");

  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  const [savedMedia, setSavedMedia] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);

  const [taggedMedia, setTaggedMedia] = useState([]);
  const [taggedPosts, setTaggedPosts] = useState([]);
  const [loadingTagged, setLoadingTagged] = useState(false);
  const [taggedLoaded, setTaggedLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .myUploads()
      .then((res) => active && setUploads(res.my_uploads))
      .finally(() => active && setLoadingUploads(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tab === "saved" && !savedLoaded) {
      setLoadingSaved(true);
      api
        .saved()
        .then((res) => {
          setSavedMedia(res.saved_media);
          setSavedPosts(res.saved_posts);
          setSavedLoaded(true);
        })
        .finally(() => setLoadingSaved(false));
    }
    if (tab === "tagged" && !taggedLoaded) {
      setLoadingTagged(true);
      api
        .taggedIn()
        .then((res) => {
          setTaggedMedia(res.tagged_media);
          setTaggedPosts(res.tagged_posts);
          setTaggedLoaded(true);
        })
        .finally(() => setLoadingTagged(false));
    }
  }, [tab, savedLoaded, taggedLoaded]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api.editProfile(form);
      setUser((u) => ({ ...u, ...form }));
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this media item? This cannot be undone.")) return;
    try {
      await api.deleteMedia(id);
      setUploads((list) => list.filter((item) => item.id !== id));
    } catch {
      // no-op; the list stays as-is on failure
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-bold text-wine-950">Your profile</h1>

      <form onSubmit={handleSave} className="card mb-12 flex flex-col gap-4 p-6">
        <Alert type="error">{error}</Alert>
        <Alert type="success">{success}</Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-wine-800">Username</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-wine-800">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-fit">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-wine-50 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tab === t.key ? "bg-white text-wine-900 shadow-sm" : "text-wine-500 hover:text-wine-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "uploads" && (
          <Link to="/upload" className="btn-outline">
            Upload new
          </Link>
        )}
      </div>

      {tab === "uploads" &&
        (loadingUploads ? (
          <Spinner />
        ) : uploads.length === 0 ? (
          <p className="text-wine-500">You haven't uploaded anything yet.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((item) => (
              <div key={item.id} className="relative">
                <MediaCard item={item} />
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-red-600 shadow hover:bg-white"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ))}

      {tab === "saved" &&
        (loadingSaved ? (
          <Spinner />
        ) : savedMedia.length === 0 && savedPosts.length === 0 ? (
          <p className="text-wine-500">Nothing saved yet — tap Save on any media or post to bookmark it.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {savedMedia.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {savedMedia.map((item) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            )}
            {savedPosts.length > 0 && (
              <div className="flex flex-col gap-4">
                {savedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        ))}

      {tab === "tagged" &&
        (loadingTagged ? (
          <Spinner />
        ) : taggedMedia.length === 0 && taggedPosts.length === 0 ? (
          <p className="text-wine-500">No one has tagged you yet.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {taggedMedia.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {taggedMedia.map((item) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            )}
            {taggedPosts.length > 0 && (
              <div className="flex flex-col gap-4">
                {taggedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
