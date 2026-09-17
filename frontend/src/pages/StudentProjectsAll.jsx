import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, LoaderCircle } from "lucide-react";
import { getStudentProjects } from "../api/routes/Public/StudentInfo.js";
import ClampedDescription from "../components/ClampedDescription.jsx";
import { normalizeTeam, projectDetailPath } from "../lib/projectUtils.js";
import "./IndividualStudentPortfolio.css";

export default function StudentProjectsAll() {
  const { user_id } = useParams();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!user_id || user_id === "undefined") return;

    setLoading(true);
    getStudentProjects(user_id)
      .then((data) => {
        if (isMounted) setProjects(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (isMounted) setProjects([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user_id]);

  if (!user_id || user_id === "undefined") {
    return <Navigate to="/students" replace />;
  }

  const projectCount = projects.length;

  return (
    <div className="all-projects-page">
      <title>Kalvium Portfolio | All Projects</title>

      <Link to={`/portfolio/${user_id}`} className="all-projects-back">
        <ArrowLeft size={16} /> Back to Portfolio
      </Link>

      <header className="all-projects-header">
        <h1 className="all-projects-title">All Projects</h1>
        <p className="all-projects-subtitle">
          {loading
            ? "Loading projects..."
            : `${projectCount} project${projectCount === 1 ? "" : "s"} showcased`}
        </p>
      </header>

      {loading ? (
        <div className="project-grid-loader">
          <LoaderCircle className="spinner-icon" />
          <span>Loading projects...</span>
        </div>
      ) : projectCount === 0 ? (
        <div className="all-projects-empty">
          This developer has not published any projects yet.
        </div>
      ) : (
        <div className="public-projects-grid">
          {projects.map((proj) => {
            const teamMembers = normalizeTeam(proj.team);
            const repoUrl = proj.github_repo || proj.github_url;
            const detailPath = projectDetailPath(user_id, proj);

            return (
              <article key={proj.id} className="public-project-card">
                <h4 className="public-project-title">
                  {proj.project_title || proj.name}
                </h4>

                <ClampedDescription
                  text={proj.project_desc || proj.description}
                  className="public-project-desc"
                  expandedText="Read more"
                  asLink
                  linkPath={detailPath}
                />

                {teamMembers.length > 0 && (
                  <p className="public-project-team">
                    <strong>Team:</strong> {teamMembers.join(", ")}
                  </p>
                )}

                <div className="public-project-meta">
                  <span className="public-project-label">Project</span>
                  <Link to={detailPath} className="public-project-view">
                    View Details <ExternalLink size={14} />
                  </Link>
                </div>

                {repoUrl && (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="public-project-repo"
                  >
                    <ExternalLink size={14} /> Repository
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}