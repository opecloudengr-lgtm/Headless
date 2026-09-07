import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MediaCard from "../components/MediaCard.jsx";
import Spinner from "../components/Spinner.jsx";

export default function PublicProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .publicProfile(userId)
      .then((res) => active && setProfile(res))
      .catch(() => active && setError("This profile couldn't be found."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);

  if (user && String(user.id) === String(userId)) {
    return <Navigate to="/profile" replace />;
  }

  if (loading) return <Spinner className="py-24" />;
  if (error || !profile) {
    return <p className="mx-auto max-w-2xl px-4 py-20 text-center text-red-600">{error}</p>;
  }

  async function handleFollow() {
    setFollowBusy(true);
    try {
      const res = await api.toggleFollow(profile.user_id);
      setProfile((p) => ({
        ...p,
        followed_by_me: !p.followed_by_me,
        followers_count: res.followers,
      }));
    } catch {
      // ignore transient failure
    } finally {
      setFollowBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="card mb-10 flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wine-gradient font-display text-3xl font-bold text-white">
          {profile.username?.[0]?.toUpperCase()}
        </div>
        <h1 className="font-display text-2xl font-bold text-wine-950">{profile.username}</h1>
        {profile.status === "suspended" && (
          <span className="badge bg-red-100 text-red-700">Account suspended</span>
        )}
        <div className="flex gap-6 text-sm text-wine-600">
          <span>
            <strong className="text-wine-900">{profile.total_uploads_count}</strong> uploads
          </span>
          <span>
            <strong className="text-wine-900">{profile.total_likes_received}</strong> likes received
          </span>
          <span>
            <strong className="text-wine-900">{profile.followers_count}</strong> followers
          </span>
        </div>
        {user && (
          <button
            onClick={handleFollow}
            disabled={followBusy}
            className={profile.followed_by_me ? "btn-outline" : "btn-primary"}
          >
            {profile.followed_by_me ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <h2 className="mb-4 font-display text-xl font-bold text-wine-950">
        {profile.username}'s uploads
      </h2>
      {profile.public_catalog.length === 0 ? (
        <p className="text-wine-500">No uploads yet.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profile.public_catalog.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
