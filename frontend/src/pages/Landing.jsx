import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import MediaCard from "../components/MediaCard.jsx";
import Spinner from "../components/Spinner.jsx";
import { LogoMark } from "../components/Logo.jsx";
import { CategoryGlyph } from "../components/CategoryIcon.jsx";

const CATEGORIES = [
  {
    name: "Movie",
    label: "Movies",
    blurb: "Indie films, shorts and features from creators worldwide, streamed straight from the browser.",
    span: "lg:col-span-2",
  },
  {
    name: "Music",
    label: "Music",
    blurb: "Original tracks, albums and lo-fi sessions to discover.",
    span: "",
  },
  {
    name: "Ebook",
    label: "Ebooks",
    blurb: "Guides, novels and technical reads from the community.",
    span: "",
  },
];

const STATS = [
  { value: "3", label: "Media formats — movies, music & ebooks" },
  { value: "∞", label: "Uploads, always free for creators" },
  { value: "2-step", label: "Password + OTP sign-in, built in" },
  { value: "24/7", label: "Curated by an active admin team" },
];

const STEPS = [
  {
    n: "01",
    title: "Create your account",
    body: "Sign up in seconds, then confirm with a one-time code — no complicated setup.",
  },
  {
    n: "02",
    title: "Upload or explore",
    body: "Share a movie, track or ebook, or browse what the community has already posted.",
  },
  {
    n: "03",
    title: "Follow & like",
    body: "Build a feed of creators you love and keep up with everything new they share.",
  },
];

export default function Landing() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .explore()
      .then((data) => {
        if (active)
          setFeatured(
            data.featured_spotlight?.length ? data.featured_spotlight : data.catalog_results.slice(0, 3)
          );
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* ---------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-wine-mesh text-white">
        <div className="pointer-events-none absolute inset-0 bg-noise mix-blend-overlay" />
        <div
          className="pointer-events-none absolute -left-24 top-10 h-72 w-72 animate-blob rounded-full bg-gold-500/20 blur-3xl"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="pointer-events-none absolute -right-16 top-40 h-80 w-80 animate-blob rounded-full bg-wine-400/25 blur-3xl"
          style={{ animationDelay: "4s" }}
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-7 px-4 py-28 text-center md:py-36">
          <span className="eyebrow-pill animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
            Now live &mdash; Movies, Music &amp; Ebooks in one place
          </span>

          <h1
            className="max-w-3xl text-balance font-display text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl animate-fade-up"
            style={{ animationDelay: "0.05s" }}
          >
            One home for everything
            <br />
            your creators{" "}
            <span className="bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
              make &amp; share.
            </span>
          </h1>

          <p
            className="max-w-xl text-balance text-lg leading-relaxed text-wine-100/85 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            Headless is where creators upload movies, music and ebooks, and where fans follow,
            like, and never miss a release — all in one curated feed.
          </p>

          <div
            className="flex flex-wrap items-center justify-center gap-3 animate-fade-up"
            style={{ animationDelay: "0.15s" }}
          >
            <Link to="/register" className="btn-gold shadow-lg shadow-gold-500/20">
              Join Headless free
            </Link>
            <Link to="/explore" className="btn border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20">
              Explore the catalog
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          <div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs font-semibold uppercase tracking-wide text-wine-200/70 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            {CATEGORIES.map((c) => (
              <span key={c.name} className="flex items-center gap-1.5">
                <CategoryGlyph category={c.name} className="h-3.5 w-3.5" />
                {c.label}
              </span>
            ))}
            <span>&middot; No credit card required</span>
          </div>
        </div>

        <div className="absolute -bottom-1 left-1/2 h-16 w-[140%] -translate-x-1/2 rounded-[100%] bg-wine-50" />
      </section>

      {/* ---------------------------------------------------------- Stats */}
      <section className="mx-auto max-w-6xl px-4 pb-4 pt-2">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-wine-100 bg-wine-100 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 bg-white px-5 py-6 text-center">
              <span className="font-display text-3xl font-extrabold text-wine-800">{s.value}</span>
              <span className="text-xs leading-snug text-wine-500">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- Category bento */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 max-w-lg">
          <p className="section-label mb-2">Browse by format</p>
          <h2 className="font-display text-3xl font-bold text-wine-950">Three formats, one feed.</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.name}
              to={`/explore?category=${c.name}`}
              className={`card group relative flex min-h-[220px] flex-col justify-end overflow-hidden p-7 transition hover:-translate-y-1 hover:shadow-wine ${c.span}`}
            >
              <div className="absolute -right-6 -top-6 flex h-32 w-32 items-center justify-center rounded-full bg-wine-50 text-wine-200 transition group-hover:scale-110 group-hover:text-wine-300">
                <CategoryGlyph category={c.name} className="h-14 w-14" />
              </div>
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-wine-700 text-white">
                <CategoryGlyph category={c.name} className="h-4 w-4" />
              </div>
              <h3 className="relative mt-4 font-display text-2xl font-bold text-wine-950">{c.label}</h3>
              <p className="relative mt-1 max-w-sm text-sm text-wine-600">{c.blurb}</p>
              <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-wine-700">
                Browse {c.label.toLowerCase()}
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 max-w-lg">
            <p className="section-label mb-2">How it works</p>
            <h2 className="font-display text-3xl font-bold text-wine-950">From sign-up to sharing in minutes.</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative flex flex-col gap-3">
                <span className="font-display text-5xl font-extrabold text-wine-100">{step.n}</span>
                <h3 className="font-display text-xl font-bold text-wine-950">{step.title}</h3>
                <p className="text-sm leading-relaxed text-wine-600">{step.body}</p>
                {i < STEPS.length - 1 && (
                  <span className="absolute right-[-1.25rem] top-6 hidden h-px w-8 bg-wine-200 md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Product preview mockup */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="section-label mb-2">Inside Headless</p>
            <h2 className="mb-4 font-display text-3xl font-bold text-wine-950">
              A feed built for discovery, not noise.
            </h2>
            <p className="mb-6 text-wine-600">
              Every upload is tagged, searchable, and easy to find again. Like what you love, follow
              the people making it, and let your dashboard surface what's new from them first.
            </p>
            <ul className="flex flex-col gap-3 text-sm text-wine-700">
              {[
                "Instant search across titles and descriptions",
                "Follow creators to build a personal feed",
                "Admin-curated spotlight for standout uploads",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-wine-100 bg-wine-950 p-2 shadow-wine">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-wine-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-wine-200/60" />
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-wine-50 p-3">
              {["Movie", "Music", "Ebook", "Movie"].map((cat, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg bg-white p-2.5 shadow-sm">
                  <div className="flex h-14 items-center justify-center rounded-md bg-gradient-to-br from-wine-500 to-wine-800 text-white/80">
                    <CategoryGlyph category={cat} className="h-5 w-5" />
                  </div>
                  <div className="h-2 w-3/4 rounded bg-wine-200" />
                  <div className="h-2 w-1/2 rounded bg-wine-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Featured spotlight */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="section-label mb-2">Fresh on Headless</p>
            <h2 className="font-display text-2xl font-bold text-wine-950">Featured spotlight</h2>
          </div>
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

      {/* ---------------------------------------------------------- Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-wine-mesh px-8 py-14 text-center text-white">
          <div className="pointer-events-none absolute inset-0 bg-noise mix-blend-overlay" />
          <LogoMark size={48} />
          <h2 className="relative mx-auto mt-4 max-w-lg font-display text-3xl font-bold">
            Your work deserves an audience.
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-wine-100/85">
            Join Headless today and put your movies, music, or ebooks in front of people looking for
            exactly that.
          </p>
          <Link to="/register" className="btn-gold relative mt-6 inline-flex">
            Create your free account
          </Link>
        </div>
      </section>
    </div>
  );
}
