import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import Alert from "../components/Alert.jsx";
import { LogoMark } from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState(location.state?.demoOtp || "");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const destination = location.state?.from || "/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.verifyOtp({ email, otp_code: otp });
      await refresh();
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    setError("");
    setInfo("");
    setResending(true);
    try {
      const res = await api.requestOtp(email);
      setDemoOtp(res.demo_otp_code || "");
      setInfo("A new OTP has been generated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend OTP.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <LogoMark size={56} />
        <h1 className="font-display text-2xl font-bold text-wine-950">Enter your OTP</h1>
        <p className="text-sm text-wine-600">
          We generated a 6-digit one-time code for <span className="font-semibold">{email || "your email"}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
        <Alert type="error">{error}</Alert>
        <Alert type="success">{info}</Alert>

        {demoOtp && (
          <Alert type="info">
            <strong>Demo mode:</strong> no email provider is configured, so here's your code:{" "}
            <span className="font-mono text-base tracking-widest">{demoOtp}</span>
          </Alert>
        )}

        {!location.state?.email && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-wine-800">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-wine-800">One-time code</label>
          <input
            className="input text-center font-mono text-lg tracking-[0.5em]"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            required
          />
        </div>

        <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary mt-2 w-full">
          {loading ? "Verifying…" : "Verify & continue"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="btn-ghost w-full"
        >
          {resending ? "Resending…" : "Resend code"}
        </button>

        <p className="text-center text-sm text-wine-600">
          Wrong account?{" "}
          <Link to="/login" className="font-semibold text-wine-800 hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </div>
  );
}
