// Shared helpers for rendering public project data.

// The DB may store `team` as a string instead of a real array,
// so normalize it before calling array methods on it.
export const normalizeTeam = (team) => {
  if (Array.isArray(team)) return team.filter(Boolean);
  if (typeof team === "string" && team.trim() !== "") {
    const trimmed = team.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        /* fall through to comma-split */
      }
    }
    return trimmed
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }
  return [];
};

// Turns a project title into a URL-friendly slug.
export const slugify = (str) =>
  (str || "project")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";

// Builds the public detail-page path for a single project:
//   /portfolio/<user_id>/projects/<project-title>-<id>
export const projectDetailPath = (userId, project) =>
  `/portfolio/${userId}/projects/${slugify(
    project.project_title || project.name
  )}-${project.id}`;

// Safe date formatter (returns null when the value is unusable).
export const formatAddedDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
};
