import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, LayoutDashboard, Trophy } from "lucide-react";
import { useUserRole } from "../../hooks/useAuthStatus.js";
import { roleHome } from "../MentorDashboard/dashboardRoutes.js";
import "../../components/EmptyState.css";

// 404 page, rendered by the `path="*"` route. Because App.jsx only hides the
// site chrome on the dashboard paths and /login, an unknown URL still shows the
// normal Navbar/Footer — this page supplies just the middle panel and keeps the
// site's typography/colours (see components/EmptyState.css) so a wrong URL
// doesn't drop the visitor onto an unstyled browser-default page.
function ErrorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isAuthenticated } = useUserRole();

  // Going "back" only makes sense when this tab actually has somewhere to go —
  // a 404 opened directly (fresh tab, shared link) has no previous entry.
  const canGoBack = window.history.length > 1;

  return (
    <main className="empty-state">
      <title>Page not found | Kalvium Portfolio</title>

      <section className="empty-state__card">
        <p className="empty-state__code" aria-hidden="true">
          404
        </p>

        <h1 className="empty-state__title">Page not found</h1>

        <p className="empty-state__body">
          Sorry, the page you’re looking for doesn’t exist or has been moved.
          Check the address, or jump back to a page that definitely exists.
        </p>

        <p className="empty-state__path">
          Requested page: <code>{location.pathname}</code>
        </p>

        <div className="empty-state__actions">
          <Link className="empty-state__btn empty-state__btn--primary" to="/">
            <Home size={18} aria-hidden="true" />
            Back to home
          </Link>

          {isAuthenticated && role ? (
            <Link
              className="empty-state__btn empty-state__btn--ghost"
              to={roleHome(role)}
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              Go to my dashboard
            </Link>
          ) : (
            <Link
              className="empty-state__btn empty-state__btn--ghost"
              to="/leaderboard"
            >
              <Trophy size={18} aria-hidden="true" />
              View leaderboard
            </Link>
          )}
        </div>

        {canGoBack && (
          <button
            type="button"
            className="empty-state__back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Go back to the previous page
          </button>
        )}
      </section>
    </main>
  );
}

export default ErrorPage;
