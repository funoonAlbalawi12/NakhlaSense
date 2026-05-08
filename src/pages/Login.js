import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import {
  beginTwoStepSignIn,
  cancelTwoStepSignIn,
  completeTwoStepSignIn,
  resetPassword,
} from "../firebase/services/authService";
import "./Login.css";

const OTP_LENGTH = 6;

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const handlePasswordStep = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    resetMessages();

    if (!normalizedEmail) {
      setError("Enter your email first.");
      return;
    }

    if (!password.trim()) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);

    try {
      const result = await beginTwoStepSignIn(normalizedEmail, password);
      setEmail(normalizedEmail);

      if (result?.requiresOtp === false) {
        window.location.replace("/dashboard");
        return;
      }

      setOtp("");
      setStep("otp");
      setMessage(`OTP sent to ${normalizedEmail}. Enter the code to finish signing in.`);
    } catch (loginError) {
      setError(loginError?.message || "Failed to verify your password.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    resetMessages();

    if (!normalizedEmail) {
      setError("Enter your email first.");
      return;
    }

    if (!normalizedOtp) {
      setError("Enter the 6-digit OTP from your email.");
      return;
    }

    if (normalizedOtp.length !== OTP_LENGTH) {
      setError("OTP must be 6 digits.");
      return;
    }

    setLoading(true);

    try {
      await completeTwoStepSignIn(normalizedEmail, normalizedOtp);
      window.location.replace("/dashboard");
    } catch (verifyError) {
      setError(verifyError?.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    resetMessages();

    if (!normalizedEmail) {
      setError("Enter your email first so we know where to send the reset link.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(normalizedEmail);
      setMessage(`Password reset email sent to ${normalizedEmail}.`);
    } catch (resetError) {
      setError(resetError?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const resetLoginFlow = async ({ clearEmail = false } = {}) => {
    await cancelTwoStepSignIn();

    if (clearEmail) {
      setEmail("");
    }

    setPassword("");
    setOtp("");
    setStep("password");
    resetMessages();
  };

  const handleUseAnotherEmail = async () => {
    await resetLoginFlow({ clearEmail: true });
  };

  const handleBackToPassword = async () => {
    await resetLoginFlow();
  };

  const handleBackHome = async (event) => {
    event.preventDefault();

    try {
      await cancelTwoStepSignIn();
    } finally {
      navigate("/", { replace: true });
    }
  };

  const handlePasswordInputChange = (event) => {
    setPassword(event.target.value);
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handleOtpChange = (event) => {
    setOtp(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
  };

  return (
    <>
      <section className="auth-hero">
        <div className="auth-container">
          <div className="auth-card">
            <Link to="/" className="back-link" onClick={handleBackHome}>
              Back to Home
            </Link>

            <h2>Login</h2>
            <p className="auth-subtitle">
              Enter your password first, then confirm the OTP sent to your email.
            </p>

            {message && <div className="auth-status auth-status-success">{message}</div>}
            {error && <div className="auth-status auth-status-error">{error}</div>}

            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={handleEmailChange}
              disabled={step === "otp" || loading}
            />

            {step === "password" ? (
              <>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={handlePasswordInputChange}
                  disabled={loading}
                />

                <button
                  type="button"
                  className={`btn-yellow ${loading ? "btn-disabled" : ""}`}
                  onClick={handlePasswordStep}
                  disabled={loading}
                >
                  {loading ? "Checking Password..." : "Continue"}
                </button>

                <button
                  type="button"
                  className="btn-link auth-secondary-link"
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </>
            ) : (
              <div className="otp-section">
                <div className="otp-meta">
                  <strong>OTP required</strong>
                  <span>{email}</span>
                  <span>Enter the 6-digit code sent after your password was confirmed.</span>
                </div>

                <input
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={OTP_LENGTH}
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={loading}
                />

                <button
                  type="button"
                  className={`btn-yellow ${loading ? "btn-disabled" : ""}`}
                  onClick={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? "Verifying OTP..." : "Verify OTP"}
                </button>

                <button
                  type="button"
                  className="btn-link"
                  onClick={handlePasswordStep}
                  disabled={loading}
                >
                  Resend OTP
                </button>

                <button
                  type="button"
                  className="btn-link"
                  onClick={handleBackToPassword}
                  disabled={loading}
                >
                  Back to password
                </button>

                <button
                  type="button"
                  className="btn-link"
                  onClick={handleUseAnotherEmail}
                  disabled={loading}
                >
                  Use another email
                </button>
              </div>
            )}

            <div className="auth-links">
              <Link to="/signup">No account? Sign up</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default Login;
