import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MediaCard from "../components/MediaCard.jsx";
import Spinner from "../components/Spinner.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .dashboard()
      .then((res) => active && setData(res))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Spinner className="py-24" />;
  if (!data) return null;

  const genres = data.explore_genres_onboarding || {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-wine-gradient p-6 text-white md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome back, {user?.username}</h1>
          <p className="text-wine-100/90">
            {data.profile_summary.total_personal_uploads} upload
            {data.profile_summary.total_personal_uploads === 1 ? "" : "s"} so far.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/upload" className="btn bg-white text-wine-800 hover:bg-wine-50">
            Upload media
          </Link>
          <Link to="/profile" className="btn-gold">
            Manage profile
          </Link>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl font-bold text-wine-950">From creators you follow</h2>
        {data.subscription_timeline_feed.length === 0 ? (
          <p className="text-wine-500">
            You're not following anyone yet — visit a creator's profile to follow them.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.subscription_timeline_feed.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {Object.entries(genres).map(([genre, items]) => (
        <section key={genre} className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-wine-950">Latest in {genre}</h2>
            <Link to={`/explore?category=${genre}`} className="text-sm font-semibold text-wine-700 hover:underline">
              View all &rarr;
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="text-wine-500">Nothing here yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
