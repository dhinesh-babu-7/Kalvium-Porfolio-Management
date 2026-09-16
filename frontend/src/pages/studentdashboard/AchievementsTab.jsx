import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Trophy, Award, Shield, Code2, Briefcase, BookOpen, ExternalLink } from "lucide-react";
import { getAchievements, createAchievement, deleteAchievement } from "../../api/routes/StudentDashboard/profile";

export default function AchievementsTab() {
  const [achievements, setAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Certificate",
    icon: "",
    externalUrl: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAchievements() {
      try {
        const fetched = await getAchievements();
        if (isMounted) {
          setAchievements(fetched || []);
          setError(null);
        }
      } catch (err) {
        console.error("Error loading achievements:", err);
        if (isMounted) setError("Failed to load achievements.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAchievements();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ title: "", description: "", category: "Certificate", icon: "", externalUrl: "" });
    setError(null);
    setSuccess(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const newAchievement = await createAchievement({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        icon: formData.icon.trim() || null,
        externalUrl: formData.externalUrl.trim() || null,
      });

      if (newAchievement) {
        setAchievements((prev) => [newAchievement, ...prev]);
        setSuccess("Achievement added successfully!");
        handleCloseModal();
      } else {
        setError("Failed to add achievement. Please try again.");
      }
    } catch (err) {
      console.error("Error adding achievement:", err);
      setError("Failed to add achievement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAchievement = async (achievementId) => {
    if (!window.confirm("Are you sure you want to delete this achievement?")) return;

    try {
      const result = await deleteAchievement(achievementId);
      if (result) {
        setAchievements((prev) => prev.filter((a) => a.id !== achievementId));
        setSuccess("Achievement deleted.");
      } else {
        setError("Failed to delete achievement.");
      }
    } catch (err) {
      console.error("Error deleting achievement:", err);
      setError("Failed to delete achievement.");
    }
  };

  const categoryIcons = {
    Certificate: Trophy,
    Award: Award,
    Badge: Shield,
    Hackathon: Code2,
    Internship: Briefcase,
    Course: BookOpen,
    Other: Award,
  };

  const categoryColors = {
    Certificate: "#f59e0b",
    Award: "#10b981",
    Badge: "#3b82f6",
    Hackathon: "#8b5cf6",
    Internship: "#06b6d4",
    Course: "#ec4899",
    Other: "#64748b",
  };

  if (isLoading) {
    return (
      <div className="pm-placeholder-card">
        <div className="pm-placeholder-icon-wrap icon-amber">
          <Trophy size={28} />
        </div>
        <div className="pm-placeholder-title-row">
          <h2>Achievements & Certifications</h2>
          <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid #e2e8f0", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <p className="pm-placeholder-description">Loading your achievements...</p>
      </div>
    );
  }

  return (
    <div className="achievements-container">
      <div className="achievements-header">
        <h2 className="achievements-title">Achievements & Certifications</h2>
        <button className="pm-btn-primary" onClick={handleOpenModal} disabled={isSubmitting}>
          <Plus size={16} /> Add Achievement
        </button>
      </div>

      {error && (
        <div className="achievement-error-banner">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="achievement-success-banner">
          <p>{success}</p>
        </div>
      )}

      {achievements.length === 0 ? (
        <div className="pm-placeholder-card">
          <div className="pm-placeholder-icon-wrap icon-amber">
            <Trophy size={28} />
          </div>
          <div className="pm-placeholder-title-row">
            <h2>No Achievements Yet</h2>
          </div>
          <p className="pm-placeholder-description">
            Start adding your certificates, awards, hackathon wins, and more!
          </p>
          <button className="pm-btn-primary" onClick={handleOpenModal}>
            <Plus size={16} /> Add Your First Achievement
          </button>
        </div>
      ) : (
        <div className="achievements-grid">
          {achievements.map((ach) => {
            const IconComponent = categoryIcons[ach.category] || Trophy;
            const color = categoryColors[ach.category] || "#64748b";

            return (
              <div key={ach.id} className="card achievement-card">
                <div className="achievement-card-header">
                  <div className="achievement-icon-wrap" style={{ backgroundColor: `${color}15`, color }}>
                    <IconComponent size={24} />
                  </div>
                  <button
                    className="achievement-delete-btn"
                    onClick={() => handleDeleteAchievement(ach.id)}
                    title="Delete achievement"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="achievement-title">{ach.title}</h3>
                {ach.description && (
                  <p className="achievement-description">{ach.description}</p>
                )}
                <div className="achievement-meta">
                  <span className="achievement-category" style={{ color }}>
                    {ach.category}
                  </span>
                  {ach.external_url && (
                    <a
                      href={ach.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="achievement-external-link"
                    >
                      <ExternalLink size={14} /> View
                    </a>
                  )}
                </div>
                {ach.created_at && (
                  <div className="achievement-date">
                    Added {new Date(ach.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Achievement Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Achievement</h3>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Achievement Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. AWS Certified Solutions Architect"
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Brief description of the achievement..."
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <div className="label-with-optional">
                  <label>Category</label>
                  <span className="optional-tag">(Required)</span>
                </div>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="pm-select"
                >
                  <option value="Certificate">Certificate</option>
                  <option value="Award">Award</option>
                  <option value="Badge">Badge</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Internship">Internship</option>
                  <option value="Course">Course</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>External Link URL</label>
                <input
                  type="url"
                  name="externalUrl"
                  placeholder="https://credential.example.com/verify"
                  value={formData.externalUrl}
                  onChange={handleChange}
                />
              </div>

              {error && (
                <div className="modal-error-message">
                  {error}
                </div>
              )}

              {success && (
                <div className="modal-success-message">
                  {success}
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
                <button type="submit" className="pm-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Achievement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
