import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROLES } from "../auth/permissions";
import Footer from "../components/Footer";
import { signUpWithPassword } from "../firebase/services/authService";
import "./Signup.css";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  role: ROLES.OPERATOR,
  region: "Riyadh",
  password: "",
  confirmPassword: "",
};

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = "Enter a valid email.";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!form.organization.trim()) nextErrors.organization = "Organization is required.";
    if (form.password.length < 6) nextErrors.password = "Use at least 6 characters.";
    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");

    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    signUpWithPassword(form)
      .then(() => {
        navigate("/dashboard");
      })
      .catch((error) => {
        setSubmitError(error?.message || "Failed to create account.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <>
      <section className="auth-hero">
        <div className="auth-overlay"></div>

        <div className="auth-container">
          <div className="auth-card signup-card">
            <Link to="/" className="back-link">
              Back to Home
            </Link>

            <h2>Sign Up</h2>

            {submitError && <div className="auth-status auth-status-error">{submitError}</div>}
            <div className="signup-note">
              New accounts can register as operator or farmer. Admin access should be assigned
              separately after account creation.
            </div>

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="signup-grid">
                <label>
                  Full Name
                  <input
                    name="name"
                    placeholder="Abeer Almutairi"
                    value={form.name}
                    onChange={handleChange}
                  />
                  {errors.name && <small className="field-error">{errors.name}</small>}
                </label>

                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    placeholder="name@nakhla.sa"
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && <small className="field-error">{errors.email}</small>}
                </label>

                <label>
                  Phone Number
                  <input
                    name="phone"
                    placeholder="+966 5X XXX XXXX"
                    value={form.phone}
                    onChange={handleChange}
                  />
                  {errors.phone && <small className="field-error">{errors.phone}</small>}
                </label>

                <label>
                  Organization
                  <input
                    name="organization"
                    placeholder="Palm Research Unit"
                    value={form.organization}
                    onChange={handleChange}
                  />
                  {errors.organization && (
                    <small className="field-error">{errors.organization}</small>
                  )}
                </label>

                <label>
                  Role
                  <select name="role" value={form.role} onChange={handleChange}>
                    <option value={ROLES.FARMER}>Farmer</option>
                    <option value={ROLES.OPERATOR}>Operator</option>
                  </select>
                </label>

                <label>
                  Region
                  <select name="region" value={form.region} onChange={handleChange}>
                    <option value="Riyadh">Riyadh</option>
                    <option value="Qassim">Qassim</option>
                    <option value="Madinah">Madinah</option>
                    <option value="Eastern Province">Eastern Province</option>
                  </select>
                </label>

                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={handleChange}
                  />
                  {errors.password && <small className="field-error">{errors.password}</small>}
                </label>

                <label>
                  Confirm Password
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Repeat the password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                  {errors.confirmPassword && (
                    <small className="field-error">{errors.confirmPassword}</small>
                  )}
                </label>
              </div>

              
              <button type="submit" className="btn-yellow" disabled={submitting}>
                {submitting ? "Creating Account..." : "Create Account "}
              </button>
            </form>

            <div className="auth-links">
              <Link to="/login">Already have an account?</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default Signup;
