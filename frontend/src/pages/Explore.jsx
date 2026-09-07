import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import MediaCard from "../components/MediaCard.jsx";
import Spinner from "../components/Spinner.jsx";

const TABS = [
  { label: "All", value: "" },
  { label: "Movies", value: "Movie" },
  { label: "Music", value: "Music" },
  { label: "Ebooks", value: "Ebook" },
];

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(q);
  const [data, setData] = useState({ featured_spotlight: [], catalog_results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .explore({ category, q })
      .then((res) => active && setData(res))
      .catch(() => active && setError("Couldn't load media right now."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category, q]);

  function setCategory(value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("category", value);
    else next.delete("category");
    setSearchParams(next);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput) next.set("q", searchInput);
    else next.delete("q");
    setSearchParams(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-wine-950">Explore media</h1>
          <p className="mt-1 text-wine-600">Browse everything the community has shared.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm gap-2">
          <input
            className="input"
            placeholder="Search titles or descriptions…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </form>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setCategory(tab.value)}
            className={`btn ${category === tab.value ? "bg-wine-700 text-white" : "btn-outline"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          {!category && !q && data.featured_spotlight?.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 font-display text-xl font-bold text-wine-950">Featured spotlight</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.featured_spotlight.map((item) => (
                  <MediaCard key={`featured-${item.id}`} item={item} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-wine-950">
              {q ? `Results for "${q}"` : category ? `${category}s` : "All media"}
            </h2>
            {data.catalog_results.length === 0 ? (
              <p className="text-wine-500">No media found. Try a different filter or search.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.catalog_results.map((item) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
