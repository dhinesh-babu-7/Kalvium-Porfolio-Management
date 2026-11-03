import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

import Sidebar from "./sidebar";
import DashboardContent from "./dashboardcontent";
import Overview from "./Overview";
import SettingsContent from "./settingsconetnt";
import Assigned from "./Assigned";
import ExceptionRequests from "./ExceptionRequests";
import LeetCodeSessionPanel from "./LeetCodeSessionPanel";
import PracticeProgress from "./PracticeProgress.jsx";

import { getSquads } from "../../api/routes/MentorDashboard/main.js";

import "./mentordashboard.css";

// URL slugs <-> tab labels live in ./dashboardRoutes.js so both App.jsx and
// this component share one mapping without breaking react-refresh.
import { mentorLabelToSlug, mentorSlugToLabel, mentorTabPath } from "./dashboardRoutes.js";

const MentorDashboard = ({ profile, isLoading = false }) => {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeNav = mentorSlugToLabel(tab);
  const setActiveNav = (label) => navigate(mentorTabPath(mentorLabelToSlug(label)));

  const userName =
    profile?.user_metadata?.full_name ||
    profile?.user_metadata?.name ||
    "Arun Kumar";

  // Whether the mentor has at least one squad (mentor_squads). null =
  // unknown/loading → nothing rendered, so there is no flash of a false
  // notice. Re-checked on every tab change so it clears right after
  // squads are saved on the Settings page.
  const [hasSquad, setHasSquad] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSquads()
      .then((res) => {
        if (cancelled) return;
        setHasSquad((res?.count || res?.squads?.length || 0) > 0);
      })
      .catch(() => {
        // Keep the last known state on network errors — never show a
        // "no squad" notice for a mentor who actually has squads.
      });
    return () => {
      cancelled = true;
    };
  }, [activeNav]);

  return (
    <div className="mentor-dashboard">

      <title>Kalvium Portfolio | Mentor Dashboard</title>

      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
      />

      <main className="dashboard-main">

        <header className="pm-topbar">

          <div className="pm-welcome">
            <span className="pm-wave">👋</span>

            <div>
              <span className="pm-welcome-sub">
                Welcome back,
              </span>

              <strong className="pm-welcome-name">
                {isLoading ? (
                  <span className="skeleton skeleton-text width-100"></span>
                ) : (
                  userName
                )}
              </strong>
            </div>
          </div>

          <div className="pm-topbar-actions">
            <Link
              to="/"
              className="pm-home-btn"
            >
              <Home size={16} />
              <span>Back to Home</span>
            </Link>
          </div>

        </header>

        {hasSquad === false && activeNav !== "Settings" && (
          <div className="no-squad-notice" role="status">
            <AlertTriangle size={16} />
            <span>
              <strong>No squad assigned yet.</strong>{" "}
              Add at least one squad in Settings to assign students and run
              LeetCode sessions.
            </span>
            <button type="button" onClick={() => setActiveNav("Settings")}>
              Go to Settings
            </button>
          </div>
        )}

        <div className="dashboard-body">

          {activeNav === "Dashboard" && (
            <DashboardContent />
          )}

          {activeNav === "Overview" && (
            <Overview profile={profile} />
          )}

          {activeNav === "Assigned" && (
            <Assigned profile={profile} onOpenExceptions={() => setActiveNav("Exception Requests")} />
          )}

          {activeNav === "Exception Requests" && (
            <ExceptionRequests profile={profile} />
          )}

          {activeNav === "Settings" && (
            <SettingsContent profile={profile} />
          )}

          {activeNav === "LeetCode" && (
            <LeetCodeSessionPanel />
          )}

          {activeNav === "Practice Progress" && (
            <PracticeProgress />
          )}

        </div>

      </main>

    </div>
  );
};

export default MentorDashboard;