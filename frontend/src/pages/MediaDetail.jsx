import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { CategoryTile } from "../components/CategoryIcon.jsx";
import Spinner from "../components/Spinner.jsx";
import Alert from "../components/Alert.jsx";

export default function MediaDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(location.state?.item || null);
  const [loading, setLoading] = useState(!location.state?.item);
  const [error, setError] = useState("");
  const [liking, setLiking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    api
      .mediaItem(id)
      .then((res) => {
        if (active) setItem(res.item);
      })
      .catch(() => active && setError("This media item couldn't be found."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (item) setEditForm({ title: item.title, description: item.description || "" });
  }, [item?.id]);

  if (loading) return <Spinner className="py-24" />;
  if (error || !item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Alert type="error">{error || "Media item not found."}</Alert>
        <Link to="/explore" className="btn-primary mt-6 inline-flex">
          Back to Explore
        </Link>
      </div>
    );
  }

  const isOwner = user && item.uploader?.id === user.id;
  const isAdmin = user?.is_admin;
  const isGuest = !user;
  const isEbook = item.category === "Ebook";
  const streamUrl = api.streamUrl(item.id);

  async function handleLike() {
    if (!user || liking) return;
    setLiking(true);
    try {
      const res = await api.toggleLike(item.id);
      setItem((prev) => ({ ...prev, liked_by_me: !prev.liked_by_me, likes_count: res.likes_count }));
    } catch {
      // ignore transient failure
    } finally {
      setLiking(false);
    }
  }

  async function handleFeatureToggle() {
    setBusy(true);
    try {
      const res = await api.adminSetFeatured(item.id, !item.is_featured);
      setItem(res.media_item);
      setNotice(res.success);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not update featured status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this media item? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api.deleteMedia(item.id);
      navigate("/explore");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not delete this item.");
      setBusy(false);
    }
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.editMedia(item.id, editForm);
      setItem(res.item);
      setEditing(false);
      setNotice(res.success);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="card overflow-hidden">
        <div className="relative h-56 w-full md:h-72">
          <CategoryTile category={item.category} className="h-full w-full" />
          {item.is_featured && (
            <span className="badge absolute left-4 top-4 bg-gold-500 text-wine-950">★ Featured</span>
          )}
        </div>

        <div className="flex flex-col gap-6 p-6 md:p-8">
          {notice && <Alert type="info">{notice}</Alert>}

          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="badge mb-2 bg-wine-100 text-wine-700">{item.category}</span>
              {editing ? (
                <input
                  className="input font-display text-2xl font-bold"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              ) : (
                <h1 className="font-display text-3xl font-bold text-wine-950">{item.title}</h1>
              )}
              <p className="mt-1 text-sm text-wine-500">
                Uploaded by{" "}
                <Link to={`/profile/${item.uploader?.id}`} className="font-semibold text-wine-700 hover:underline">
                  {item.uploader?.username}
                </Link>{" "}
                &middot; {new Date(item.uploaded_at).toLocaleDateString()}
              </p>
            </div>

            <button
              onClick={handleLike}
              disabled={!user || liking}
              className={`btn ${item.liked_by_me ? "bg-wine-700 text-white" : "btn-outline"} shrink-0`}
            >
              {item.liked_by_me ? "♥ Liked" : "♡ Like"} &middot; {item.likes_count}
            </button>
          </div>

          {editing ? (
            <textarea
              className="input min-h-24"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />
          ) : (
            item.description && <p className="text-wine-700">{item.description}</p>
          )}

          <div className="rounded-xl bg-wine-50 p-4">
            {isEbook && isGuest ? (
              <div className="text-center">
                <p className="mb-3 text-wine-700">Log in to read the full ebook.</p>
                <Link to="/login" className="btn-primary">
                  Log in to continue
                </Link>
              </div>
            ) : item.category === "Movie" ? (
              <video controls className="w-full rounded-lg bg-black" src={streamUrl} />
            ) : item.category === "Music" ? (
              <audio controls className="w-full" src={streamUrl} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-wine-700">This ebook is ready to read.</p>
                <a href={streamUrl} target="_blank" rel="noreferrer" className="btn-primary">
                  Open ebook
                </a>
              </div>
            )}

            {isGuest && !isEbook && (
              <p className="mt-3 text-center text-xs text-wine-500">
                Guest preview limited to a short clip.{" "}
                <Link to="/login" className="font-semibold text-wine-700 hover:underline">
                  Log in
                </Link>{" "}
                for full playback.
              </p>
            )}
          </div>

          {(isOwner || isAdmin) && (
            <div className="flex flex-wrap gap-2 border-t border-wine-100 pt-4">
              {editing ? (
                <>
                  <button onClick={handleEditSave} disabled={busy} className="btn-primary">
                    Save changes
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-ghost">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-outline">
                  Edit details
                </button>
              )}
              <button onClick={handleDelete} disabled={busy} className="btn bg-red-600 text-white hover:bg-red-700">
                Delete
              </button>
              {isAdmin && (
                <button onClick={handleFeatureToggle} disabled={busy} className="btn-gold">
                  {item.is_featured ? "Remove from featured" : "Feature this item"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
