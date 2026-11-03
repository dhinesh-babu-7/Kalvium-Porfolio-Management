import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  FileWarning,
  Activity,
  BookOpenCheck,
  Menu,
  X,
  CalendarCheck,
} from "lucide-react";

import kalviumLogo from "../../assets/kalvium-logo.svg";
import dojoPulseShrine from "../../assets/dojo-pulse-shrine.svg";
import { supabase } from "../../lib/supabase";
import { getExceptionRequestCount } from "../../api/routes/Mentor/exception";
import { DOJO_PULSE_URL, ATTEND_FLOW_URL } from "./dashboardRoutes.js";
import "./mentordashboard.css";
import "./sidebar.css";

// Added "Overview" to the navigation array
const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Overview", icon: Eye },
  { label: "Assigned", icon: Users },
  { label: "Practice Progress", icon: BookOpenCheck },
  { label: "Exception Requests", icon: FileWarning },
  { label: "Settings", icon: Settings },
  { label: "LeetCode", icon: Activity },
];

const Sidebar = ({ activeNav, setActiveNav }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [exceptionCount, setExceptionCount] = useState(0);
  // Mobile hamburger (<=768px): nav rows are hidden until the menu opens.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setIsCollapsed(false); // sidebar always expanded on mobile
      else setMobileOpen(false); // menu state irrelevant on desktop
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleSidebarToggle = () => {
    if (isMobile) setMobileOpen((open) => !open);
    else setIsCollapsed((collapsed) => !collapsed);
  };
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    getExceptionRequestCount().then((d) => {
      if (alive) setExceptionCount(d?.pendingCount ?? 0);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

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
    <aside className={`pm-sidebar ${isCollapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}>
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
          onClick={handleSidebarToggle}
          title={isMobile ? (mobileOpen ? "Close menu" : "Open menu") : isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isMobile ? (mobileOpen ? "Close menu" : "Open menu") : "Toggle Sidebar"}
          aria-expanded={isMobile ? mobileOpen : !isCollapsed}
        >
          {isMobile ? (
            mobileOpen ? <X size={18} /> : <Menu size={18} />
          ) : isCollapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>
      </div>

      <nav className="pm-nav">
        {NAV_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={`pm-nav-item ${activeNav === label ? "is-active" : ""}`}
            onClick={() => {
              setActiveNav(label);
              if (isMobile) setMobileOpen(false);
            }}
            title={isCollapsed ? label : ""}
          >
            <Icon size={18} strokeWidth={2} />
            {!isCollapsed && <span>{label}</span>}
            {label === "Exception Requests" && exceptionCount > 0 && (
              <span className="pm-nav-badge">{exceptionCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Secondary section: direct links to external mentor tools */}
      <nav className="pm-nav pm-nav-quick" aria-label="Quick Access">
        {!isCollapsed && (
          <span className="pm-nav-section-title">Quick Access</span>
        )}
        <a
          className="pm-nav-item"
          href={DOJO_PULSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={isCollapsed ? "Dojo Pulse (opens in a new tab)" : ""}
          onClick={() => {
            if (isMobile) setMobileOpen(false);
          }}
        >
          <img
            src={dojoPulseShrine}
            alt=""
            aria-hidden="true"
            className="pm-nav-shrine-logo"
            width={18}
            height={18}
          />
          {!isCollapsed && <span>Dojo Pulse</span>}
        </a>
        <a
          className="pm-nav-item"
          href={ATTEND_FLOW_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={isCollapsed ? "AttendFlow (opens in a new tab)" : ""}
          onClick={() => {
            if (isMobile) setMobileOpen(false);
          }}
        >
          <CalendarCheck size={18} strokeWidth={2} />
          {!isCollapsed && <span>AttendFlow</span>}
        </a>
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