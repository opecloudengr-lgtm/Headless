import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

/**
 * @mention-style user tagger: type to search, click a result to add
 * it as a chip. Used on the upload form (tag whoever requested this)
 * and the post composer (tag anyone in a timeline post).
 */
export default function TagPicker({ value, onChange, placeholder = "Tag someone…" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    const timeout = setTimeout(() => {
      api
        .searchUsers(query.trim())
        .then((res) => {
          if (active) setResults(res.users.filter((u) => !value.includes(u.username)));
        })
        .catch(() => {});
    }, 200);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, value]);

  function addTag(username) {
    if (!value.includes(username)) onChange([...value, username]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeTag(username) {
    onChange(value.filter((u) => u !== username));
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-wine-200 bg-white px-2 py-1.5 focus-within:border-wine-500 focus-within:ring-2 focus-within:ring-wine-200">
        {value.map((username) => (
          <span
            key={username}
            className="flex items-center gap-1 rounded-full bg-wine-100 px-2.5 py-1 text-xs font-semibold text-wine-800"
          >
            @{username}
            <button
              type="button"
              onClick={() => removeTag(username)}
              className="text-wine-500 hover:text-wine-800"
              aria-label={`Remove ${username}`}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 border-none bg-transparent px-1 py-1 text-sm outline-none placeholder-wine-400"
          value={query}
          placeholder={value.length ? "Add another…" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-wine-100 bg-white shadow-wine">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => addTag(u.username)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-wine-800 hover:bg-wine-50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-wine-100 text-xs font-bold text-wine-700">
                {u.username[0]?.toUpperCase()}
              </span>
              {u.username}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
