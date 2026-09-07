import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import Alert from "../components/Alert.jsx";
import { LogoMark } from "../components/Logo.jsx";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: "", password: "" });
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
      const res = await api.login(form);
      navigate("/verify-otp", {
        state: {
          email: res.email,
          demoOtp: res.demo_otp_code,
          from: location.state?.from?.pathname || "/dashboard",
        },
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
        <h1 className="font-display text-2xl font-bold text-wine-950">Welcome back</h1>
        <p className="text-sm text-wine-600">Log in with your password, then confirm with an OTP.</p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
        <Alert type="error">{error}</Alert>

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">Username or email</label>
          <input
            className="input"
            value={form.identifier}
            onChange={update("identifier")}
            placeholder="jane_creator or you@example.com"
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
            placeholder="Your password"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
          {loading ? "Checking…" : "Continue"}
        </button>

        <p className="text-center text-sm text-wine-600">
          New to Headless?{" "}
          <Link to="/register" className="font-semibold text-wine-800 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
