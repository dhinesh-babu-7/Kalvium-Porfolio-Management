import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Eye,
} from "lucide-react";

import kalviumLogo from "../../assets/kalvium-logo.svg";
import { supabase } from "../../lib/supabase";
import "./mentordashboard.css";
import "./sidebar.css";

// Added "Overview" to the navigation array
const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Overview", icon: Eye },
  { label: "Assigned", icon: Users },
  { label: "Mentor Review", icon: ShieldCheck },
  { label: "Settings", icon: Settings },
];

const Sidebar = ({ activeNav, setActiveNav }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      navigate("/login");
    }
  };

  return (
    <aside className={`pm-sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="pm-brand-header">
        {!isCollapsed && (
          <div className="pm-brand">
            <div className="pm-brand-mark">
              <img src={kalviumLogo} alt="Kalvium Logo" className="pm-logo-img" />
            </div>
            <div className="pm-brand-text">
              <span className="pm-brand-title">KALVIUM</span>
              <span className="pm-brand-sub">MENTOR DASHBOARD</span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="pm-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="pm-nav">
        {NAV_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={`pm-nav-item ${activeNav === label ? "is-active" : ""}`}
            onClick={() => setActiveNav(label)}
            title={isCollapsed ? label : ""}
          >
            <Icon size={18} strokeWidth={2} />
            {!isCollapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="pm-logout"
        onClick={handleLogout}
        title={isCollapsed ? "Logout" : ""}
      >
        <LogOut size={18} />
        {!isCollapsed && <span>Logout</span>}
      </button>
    </aside>
  );
};

export default Sidebar;