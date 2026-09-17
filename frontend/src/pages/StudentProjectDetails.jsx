import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ExternalLink, ArrowLeft, LoaderCircle } from "lucide-react";
import {
  getStudentProjectById,
  getStudentProjects,
} from "../api/routes/Public/StudentInfo.js";
import { normalizeTeam, formatAddedDate } from "../lib/projectUtils.js";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Extracts the trailing project id from a "project-name-<id>" slug.
// Ids can be UUIDs (which contain dashes) or plain numbers, so we scan
// for the first dash-suffix that looks like a real id.
const extractProjectId = (slug) => {
  if (!slug) return null;
  const parts = slug.split("-");
  for (let i = 1; i < parts.length; i += 1) {
    const candidate = parts.slice(i).join("-");
    if (UUID_RE.test(candidate) || /^\d+$/.test(candidate)) return candidate;
  }
  return parts[parts.length - 1] || null;
};

export default function StudentProjectDetails() {
  const { user_id, project_slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = extractProjectId(project_slug);

    if (!user_id || !id) {
      setError("Invalid project link.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getStudentProjectById(user_id, id)
      .catch(async (err) => {
        // Fallback: look the project up in the full public list.
        console.warn("Direct project fetch failed, falling back to list:", err);
        const list = await getStudentProjects(user_id).catch(() => []);
        const match = Array.isArray(list)
          ? list.find((p) => String(p.id) === id)
          : null;
        if (!match) throw err;
        return match;
      })
      .then((data) => {
        if (!isMounted) return;
        setProject(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to fetch project:", err);
        setError("This project does not exist or is no longer available.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user_id, project_slug]);

  if (!user_id || user_id === "undefined") {
    return (
      <div className="project-detail-page">
        <p className="all-projects-empty">Invalid student.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="project-detail-page">
        <div className="project-grid-loader">
          <LoaderCircle className="spinner-icon" size={28} />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="error-container" style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2>{error || "Project not found"}</h2>
        <button
          onClick={() => navigate(-1)}
          className="action-btn secondary-btn"
          style={{ marginTop: "20px", display: "inline-flex" }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const teamMembers = normalizeTeam(project.team);
  const repoUrl = project.github_repo || project.github_url;
  const addedDate = formatAddedDate(project.created_at);

  return (
    <div className="project-detail-page">
      <Link to={`/portfolio/${user_id}`} className="all-projects-back">
        <ArrowLeft size={16} /> Back to Portfolio
      </Link>

      <article className="project-detail-card">
        <div className="project-detail-header">
          <h2 className="project-detail-title">
            {project.project_title || project.name}
          </h2>
          {addedDate && <p className="project-detail-date">Added: {addedDate}</p>}
        </div>

        <p className="project-detail-desc">
          {project.project_desc || project.description}
        </p>

        {teamMembers.length > 0 && (
          <p className="public-project-team">
            <strong>Team:</strong> {teamMembers.join(", ")}
          </p>
        )}

        {repoUrl && (
          <div className="public-project-meta">
            <span className="public-project-label">Repository</span>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="public-project-view"
            >
              <ExternalLink size={14} /> View
            </a>
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          className="action-btn secondary-btn"
          style={{ marginTop: "24px", display: "inline-flex" }}
        >
          ← Back
        </button>
      </article>
    </div>
  );
}
