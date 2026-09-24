// Shared slug <-> label maps for the role dashboards.
// Kept in its own module (no components) so react-refresh stays happy.

// The default tab is the "main" dashboard and deliberately lives at the bare
// base path (/mentor/dashboard, not /mentor/dashboard/dashboard). These base
// strings are the single source of truth; AuthGate re-exports them as the
// per-role HOME constants.
export const DEFAULT_TAB = "dashboard";

export const MENTOR_BASE = "/mentor/dashboard";
export const STUDENT_BASE = "/student/dashboard";

export const MENTOR_TABS = ["dashboard", "overview", "assigned", "review", "settings"];

export const MENTOR_TAB_LABELS = {
  dashboard: "Dashboard",
  overview: "Overview",
  assigned: "Assigned",
  review: "Mentor Review",
  settings: "Settings",
};

export function mentorSlugToLabel(slug) {
  return MENTOR_TAB_LABELS[slug] ?? "Dashboard";
}

export function mentorLabelToSlug(label) {
  const entry = Object.entries(MENTOR_TAB_LABELS).find(([, v]) => v === label);
  return entry ? entry[0] : DEFAULT_TAB;
}

// Canonical URL for a mentor tab. The default tab collapses onto the bare base
// path so links never carry a redundant "/mentor/dashboard/dashboard" suffix.
export function mentorTabPath(slug) {
  const safe = MENTOR_TABS.includes(slug) ? slug : DEFAULT_TAB;
  return safe === DEFAULT_TAB ? MENTOR_BASE : `${MENTOR_BASE}/${safe}`;
}

export const STUDENT_TABS = ["dashboard", "profile", "projects", "achievements", "settings"];

export const STUDENT_TAB_LABELS = {
  dashboard: "Dashboard",
  profile: "Profile",
  projects: "Projects",
  achievements: "Achievements",
  settings: "Settings",
};

export function studentSlugToLabel(slug) {
  return STUDENT_TAB_LABELS[slug] ?? "Dashboard";
}

export function studentLabelToSlug(label) {
  const entry = Object.entries(STUDENT_TAB_LABELS).find(([, v]) => v === label);
  return entry ? entry[0] : DEFAULT_TAB;
}

// Canonical URL for a student tab — same bare-base rule as the mentor side.
export function studentTabPath(slug) {
  const safe = STUDENT_TABS.includes(slug) ? slug : DEFAULT_TAB;
  return safe === DEFAULT_TAB ? STUDENT_BASE : `${STUDENT_BASE}/${safe}`;
}

// Role -> canonical home path. Shared by AuthGate (post-login redirects) and the
// access-denied page ("go to my dashboard" button) so the two can never disagree.
export function roleHome(role) {
  if (role === "mentor") return MENTOR_BASE;
  if (role === "student") return STUDENT_BASE;
  return "/login";
}
