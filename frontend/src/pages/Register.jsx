import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import Alert from "../components/Alert.jsx";
import { LogoMark } from "../components/Logo.jsx";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.register(form);
      navigate("/verify-otp", {
        state: { email: res.email, demoOtp: res.demo_otp_code, from: "/dashboard" },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <LogoMark size={56} />
        <h1 className="font-display text-2xl font-bold text-wine-950">Create your account</h1>
        <p className="text-sm text-wine-600">Join Headless to upload, follow and like media.</p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
        <Alert type="error">{error}</Alert>

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">Username</label>
          <input
            className="input"
            value={form.username}
            onChange={update("username")}
            placeholder="jane_creator"
            minLength={3}
            maxLength={50}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">Email</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={update("email")}
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">Password</label>
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={update("password")}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-wine-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-wine-800 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
