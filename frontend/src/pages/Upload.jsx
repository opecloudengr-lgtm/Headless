import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Alert from "../components/Alert.jsx";

const ACCEPT = {
  Movie: ".mp4,.mkv,.avi",
  Music: ".mp3,.wav,.m4a",
  Ebook: ".pdf,.epub",
};

export default function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", category_id: "", is_featured: false });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .categories()
      .then((res) => {
        setCategories(res.categories);
        setForm((f) => ({ ...f, category_id: res.categories[0]?.id || "" }));
      })
      .catch(() => setError("Could not load categories."));
  }, []);

  const selectedCategory = categories.find((c) => String(c.id) === String(form.category_id));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("category_id", form.category_id);
    data.append("is_featured", String(form.is_featured));
    data.append("media_file", file);

    setLoading(true);
    try {
      const res = await api.uploadMedia(data);
      navigate(`/media/${res.item.id}`, { state: { item: res.item } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 font-display text-3xl font-bold text-wine-950">Upload media</h1>
      <p className="mb-8 text-wine-600">Share a movie, track, or ebook with the Headless community.</p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
        <Alert type="error">{error}</Alert>

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">Title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">Description</label>
          <textarea
            className="input min-h-24"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">Category</label>
          <select
            className="input"
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">File</label>
          <input
            type="file"
            className="input file:mr-3 file:rounded-full file:border-0 file:bg-wine-700 file:px-3 file:py-1.5 file:text-white"
            accept={selectedCategory ? ACCEPT[selectedCategory.name] : undefined}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          {selectedCategory && (
            <p className="mt-1 text-xs text-wine-500">
              Allowed: {ACCEPT[selectedCategory.name]?.replaceAll(".", "").replaceAll(",", ", ")}
            </p>
          )}
        </div>

        {user?.is_admin && (
          <label className="flex items-center gap-2 text-sm font-semibold text-wine-800">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              className="h-4 w-4 rounded border-wine-300 text-wine-700 focus:ring-wine-400"
            />
            Feature this item immediately
          </label>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
          {loading ? "Uploading…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
