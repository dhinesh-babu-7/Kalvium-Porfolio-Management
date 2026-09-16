import React, { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { getProjects, createProject, deleteProject } from "../../api/routes/StudentDashboard/profile";
import "./projects.css";

export default function Projects() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

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
                <h3>{proj.name}</h3>
                <button
                  className="project-delete-btn"
                  onClick={() => handleDeleteProject(proj.id)}
                  title="Delete project"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p>{proj.description}</p>
              {proj.github_url && (
                <a
                  href={proj.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="project-github-link"
                >
                  <Github size={14} /> Repository
                </a>
              )}
              {proj.team && proj.team.length > 0 && (
                <div className="project-team-tags">
                  <strong>Team:</strong> {proj.team.join(", ")}
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
    </div>
  );
}
