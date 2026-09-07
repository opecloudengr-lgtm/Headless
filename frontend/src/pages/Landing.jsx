import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import MediaCard from "../components/MediaCard.jsx";
import Spinner from "../components/Spinner.jsx";
import { LogoMark } from "../components/Logo.jsx";
import { CategoryGlyph } from "../components/CategoryIcon.jsx";

const CATEGORIES = [
  { name: "Movie", label: "Movies", blurb: "Indie films, shorts and features from creators worldwide." },
  { name: "Music", label: "Music", blurb: "Original tracks, albums and lo-fi sessions to discover." },
  { name: "Ebook", label: "Ebooks", blurb: "Guides, novels and technical reads from the community." },
];

export default function Landing() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .explore()
      .then((data) => {
        if (active) setFeatured(data.featured_spotlight?.length ? data.featured_spotlight : data.catalog_results.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden bg-wine-gradient text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-24 text-center">
          <LogoMark size={72} />
          <h1 className="max-w-2xl font-display text-4xl font-extrabold leading-tight md:text-5xl">
            Share your movies, music &amp; ebooks with the world.
          </h1>
          <p className="max-w-xl text-lg text-wine-100/90">
            Headless is a home for creators — upload your work, follow the people you admire,
            and discover media curated by a community that cares.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/explore" className="btn bg-white text-wine-800 hover:bg-wine-50">
              Explore media
            </Link>
            <Link to="/register" className="btn-gold">
              Join Headless free
            </Link>
          </div>
        </div>
        <div className="absolute -bottom-16 left-1/2 h-32 w-[140%] -translate-x-1/2 rounded-[100%] bg-wine-50" />
      </section>

      <section className="mx-auto -mt-6 max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.name}
              to={`/explore?category=${c.name}`}
              className="card group flex flex-col gap-3 p-6 transition hover:-translate-y-1 hover:shadow-wine"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-wine-100 text-wine-700 transition group-hover:bg-wine-700 group-hover:text-white">
                <CategoryGlyph category={c.name} className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-wine-950">{c.label}</h3>
              <p className="text-sm text-wine-600">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-wine-950">Featured spotlight</h2>
          <Link to="/explore" className="text-sm font-semibold text-wine-700 hover:underline">
            View all &rarr;
          </Link>
        </div>

        {loading ? (
          <Spinner />
        ) : featured.length === 0 ? (
          <p className="text-wine-500">Nothing to show yet — be the first to upload.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
