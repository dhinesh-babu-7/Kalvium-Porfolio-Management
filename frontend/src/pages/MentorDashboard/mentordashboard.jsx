import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";

import Sidebar from "./sidebar";
import DashboardContent from "./dashboardcontent";
import Overview from "./Overview";
import SettingsContent from "./settingsconetnt";
import Assigned from "./Assigned";
import MentorReview from "./MentorReview";

import "./mentordashboard.css";

const MentorDashboard = ({ profile, isLoading = false }) => {
  const [activeNav, setActiveNav] = useState("Dashboard");

  const userName =
    profile?.user_metadata?.full_name ||
    profile?.user_metadata?.name ||
    "Arun Kumar";

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

        <div className="dashboard-body">

          {activeNav === "Dashboard" && (
            <DashboardContent />
          )}

          {activeNav === "Overview" && (
            <Overview profile={profile} />
          )}

          {activeNav === "Assigned" && (
            <Assigned profile={profile} />
          )}

          {activeNav === "Mentor Review" && (
            <MentorReview profile={profile} />
          )}

          {activeNav === "Settings" && (
            <SettingsContent profile={profile} />
          )}

        </div>

      </main>

    </div>
  );
};

export default MentorDashboard;