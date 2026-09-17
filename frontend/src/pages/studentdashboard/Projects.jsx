import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, ExternalLink } from "lucide-react";
import { getProjects, createProject, deleteProject } from "../../api/routes/StudentDashboard/profile";
import "./projects.css";


const normalizeTeam = (team) => {
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
    return trimmed.split(",").map((m) => m.trim()).filter(Boolean);
  }
  return [];
};

// Clamps description to 4 lines with a "Read more"/"Show less" toggle
// that only appears when the text actually overflows.
function ProjectDescription({ text }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const descRef = React.useRef(null);

  React.useEffect(() => {
    const el = descRef.current;
    if (!el) return;

    const measure = () =>
      setIsTruncated(el.scrollHeight > el.clientHeight + 1);

    // Element is clamped by default, so overflow here means the text
    // exceeds 4 lines.
    measure();

    // Re-measure once webfonts finish loading (line heights can change)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
  }, [text]);

  if (!text) return null;

  return (
    <>
      <p
        ref={descRef}
        className={`project-desc ${isExpanded ? "expanded" : "clamped"}`}
      >
        {text}
      </p>
      {isTruncated && (
        <button
          type="button"
          className="desc-toggle-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}

export default function Projects() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    githubUrl: "",
    team: [""],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const fetchedProjects = await getProjects();
        if (isMounted) {
          setProjects(fetchedProjects || []);
          setError(null);
        }
      } catch (err) {
        console.error("Error loading projects:", err);
        if (isMounted) setError("Failed to load projects.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: "", description: "", githubUrl: "", team: [""] });
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTeamChange = (index, value) => {
    const updatedTeam = [...formData.team];
    updatedTeam[index] = value;
    setFormData((prev) => ({ ...prev, team: updatedTeam }));
  };

  const addTeamMember = () => {
    setFormData((prev) => ({ ...prev, team: [...prev.team, ""] }));
  };

  const removeTeamMember = (index) => {
    const updatedTeam = formData.team.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      team: updatedTeam.length ? updatedTeam : [""],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const cleanedTeam = formData.team.filter((member) => member.trim() !== "");

    try {
      const newProject = await createProject({
        name: formData.name.trim(),
        description: formData.description.trim(),
        githubUrl: formData.githubUrl.trim() || null,
        team: cleanedTeam,
      });

      if (newProject) {
        setProjects((prev) => [newProject, ...prev]);
        handleCloseModal();
      } else {
        setError("Failed to add project. Please try again.");
      }
    } catch (err) {
      console.error("Error adding project:", err);
      setError("Failed to add project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    const projectId = projectToDelete.id;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteProject(projectId);
      if (result) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        setError("Failed to delete project.");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      setError("Failed to delete project.");
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="projects-container">
        <div className="projects-header">
          <h2 className="projects-title">Projects Showcase</h2>
        </div>
        <div className="card empty-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid #e2e8f0", borderTopColor: "#ff3b3b", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h3 style={{ color: "#64748b", margin: "0 0 8px" }}>Loading projects...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h2 className="projects-title">Projects Showcase</h2>
        <button className="pr-button" onClick={handleOpenModal} disabled={isSubmitting}>
          <Plus size={16} /> Add Project
        </button>
      </div>

      {error && (
        <div className="project-error-banner">
          <p>{error}</p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card empty-card">
          <h3>No projects added yet</h3>
          <p>Click "+ Add Project" above to feature your work.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((proj) => (
            <div key={proj.id} className="card project-card">
              <div className="project-card-header">
                <h3>{proj.project_title || proj.name}</h3>
                <button
                  className="project-delete-btn"
                  onClick={() => setProjectToDelete(proj)}
                  title="Delete project"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <ProjectDescription text={proj.project_desc || proj.description} />
              {(() => {
                const teamMembers = normalizeTeam(proj.team);
                return teamMembers.length > 0 && (
                  <div className="project-team-tags">
                    <strong>Team:</strong> {teamMembers.join(", ")}
                  </div>
                );
              })()}
              {(proj.github_repo || proj.github_url) && (
                <div className="project-meta">
                  <span className="project-category-label">Repository</span>
                  <a
                    href={proj.github_repo || proj.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="project-external-link"
                  >
                    <ExternalLink size={14} /> View
                  </a>
                </div>
              )}
              {proj.created_at && (
                <div className="project-date">
                  Added {new Date(proj.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal Box */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Project</h3>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Kalvium Portal"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  required
                  rows="3"
                  placeholder="Brief summary of your project..."
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>GitHub Repository URL</label>
                <input
                  type="url"
                  name="githubUrl"
                  placeholder="https://github.com/user/repository"
                  value={formData.githubUrl}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <div className="label-with-optional">
                  <label>Team Members</label>
                  <span className="optional-tag">(Optional)</span>
                </div>

                {formData.team.map((member, index) => (
                  <div key={index} className="team-input-row">
                    <input
                      type="text"
                      placeholder={`Member ${index + 1} name`}
                      value={member}
                      onChange={(e) => handleTeamChange(index, e.target.value)}
                    />
                    {formData.team.length > 1 && (
                      <button
                        type="button"
                        className="remove-team-btn"
                        onClick={() => removeTeamMember(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="add-team-btn"
                  onClick={addTeamMember}
                >
                  <Plus size={14} /> Add Team Member
                </button>
              </div>

              {error && (
                <div className="modal-error-message">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="pr-button" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setProjectToDelete(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Project</h3>
              <button
                className="close-btn"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
              >
                <X size={18} />
              </button>
            </div>
            <p className="delete-confirm-text">
              Are you sure you want to delete{" "}
              <strong>{projectToDelete.project_title || projectToDelete.name}</strong>? This
              action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete"
                onClick={handleDeleteProject}
                disabled={isDeleting}
              >
                <Trash2 size={14} /> {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
