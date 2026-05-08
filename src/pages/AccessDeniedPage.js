import { Link, useLocation } from "react-router-dom";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { getAccessDeniedMessage } from "../utils/roleExperience";

export default function AccessDeniedPage() {
  const location = useLocation();
  const from = location.state?.from || "/dashboard";
  const requiredPermission = location.state?.requiredPermission || "";

  return (
    <>
      <Navigation />
      <div className="dashboard-page container-fluid">
        <div className="container py-5">
          <section className="report-card">
            <div className="app-page-header-copy">
              <h1 className="page-title mb-2">Access Denied</h1>
              <p className="section-subtitle">
                {getAccessDeniedMessage(requiredPermission)} Please go back to a page that matches your role.
              </p>
            </div>
            <div className="app-page-actions">
              <Link to="/dashboard" className="btn btn-outline-success">
                Go to Dashboard
              </Link>
              <Link to={from} className="btn btn-outline-secondary">
                Go Back
              </Link>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
