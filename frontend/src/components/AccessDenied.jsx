import { Link, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { roleHome } from "../pages/MentorDashboard/dashboardRoutes.js";
import "./AccessDenied.css";

// Shown when a signed-in user opens the other role's area — e.g. a mentor
// visiting /student/dashboard. The dashboard routes deliberately render without
// the site chrome (App.jsx hides Navbar/Footer there), so this page brings its
// own Navbar + Footer to stay visually consistent with the rest of the website
// instead of dead-ending on a blank utility screen.
const ROLE_LABELS = {
  student: "Student",
  mentor: "Mentor",
};

function labelFor(role) {
  return ROLE_LABELS[role] ?? "Unknown";
}

function AccessDenied({ role, allowedRoles = [] }) {
  const location = useLocation();
  const home = roleHome(role);
  const areas = allowedRoles.map(labelFor).join(" / ");

  return (
    <div className="access-denied">
      <Navbar />

      <main className="access-denied__main">
        <section
          className="access-denied__card"
          role="alert"
          aria-labelledby="access-denied-title"
        >
          <span className="access-denied__icon" aria-hidden="true">
            <ShieldAlert size={26} />
          </span>

          <p className="access-denied__eyebrow">Restricted area</p>
          <h1 className="access-denied__title" id="access-denied-title">
            Access denied
          </h1>

          <p className="access-denied__body">
            You are signed in as <strong>{labelFor(role)}</strong>. This area is
            reserved for {areas || "other"} accounts, so it is not available to
            the account you are currently using.
          </p>

          <p className="access-denied__path">
            Requested page: <code>{location.pathname}</code>
          </p>

          <div className="access-denied__actions">
            <Link
              className="access-denied__btn access-denied__btn--primary"
              to={home}
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              Go to my dashboard
            </Link>
            <Link
              className="access-denied__btn access-denied__btn--ghost"
              to="/"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Back to home
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AccessDenied;
