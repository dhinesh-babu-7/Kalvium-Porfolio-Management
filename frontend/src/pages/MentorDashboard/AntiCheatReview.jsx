import { useState, useEffect } from "react";
import { getAntiCheatFlags, clearAntiCheatFlag, confirmAntiCheatViolation } from "../../api/routes/Mentor/antiCheat";
import "./AntiCheatReview.css";

function AntiCheatReview() {
  const [flags, setFlags] = useState([]);
  const [filteredFlags, setFilteredFlags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending");
  const [severityFilter, setSeverityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Summary stats
  const [summary, setSummary] = useState({
    pending: 0,
    cleared: 0,
    confirmed: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  // ============================================================
  // FETCH FLAGS
  // ============================================================

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getAntiCheatFlags({
        status: statusFilter === "all" ? undefined : statusFilter,
        severity: severityFilter || undefined,
        search: searchQuery || undefined,
      });

      if (result?.success) {
        setFlags(result.flags || []);
        setSummary(result.summary || {});
      } else {
        setError(result?.error || "Failed to fetch flags");
      }
    } catch (err) {
      console.error("Error fetching flags:", err);
      setError("Failed to load anti-cheat flags");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // FILTER LOGIC
  // ============================================================

  useEffect(() => {
    let filtered = [...flags];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((f) => f.status === statusFilter);
    }

    // Apply severity filter
    if (severityFilter) {
      filtered = filtered.filter((f) => f.severity === severityFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.student_name?.toLowerCase().includes(query) ||
          f.leetcode_username?.toLowerCase().includes(query)
      );
    }

    setFilteredFlags(filtered);
  }, [flags, statusFilter, severityFilter, searchQuery]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleClearFlag = async () => {
    if (!selectedFlag) return;

    try {
      setActionInProgress("clearing");
      const result = await clearAntiCheatFlag(
        selectedFlag.student_id,
        selectedFlag.mentorNote
      );

      if (result?.success) {
        // Update local state
        setFlags(
          flags.map((f) =>
            f.student_id === selectedFlag.student_id
              ? { ...f, status: "cleared" }
              : f
          )
        );

        setShowDetailsModal(false);
        setSelectedFlag(null);
        
        // Show success message
        console.log("Flag cleared successfully");
      }
    } catch (err) {
      setError("Failed to clear flag: " + (err.message || "Unknown error"));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmViolation = async () => {
    if (!selectedFlag) return;

    try {
      setActionInProgress("confirming");
      const result = await confirmAntiCheatViolation(
        selectedFlag.student_id,
        selectedFlag.mentorNote
      );

      if (result?.success) {
        // Update local state
        setFlags(
          flags.map((f) =>
            f.student_id === selectedFlag.student_id
              ? { ...f, status: "confirmed" }
              : f
          )
        );

        setShowDetailsModal(false);
        setSelectedFlag(null);
        
        // Show success message
        console.log("Violation confirmed successfully");
      }
    } catch (err) {
      setError("Failed to confirm violation: " + (err.message || "Unknown error"));
    } finally {
      setActionInProgress(null);
    }
  };

  const openDetails = (flag) => {
    setSelectedFlag(flag);
    setShowDetailsModal(true);
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "#dc3545";
      case "medium":
        return "#fd7e14";
      case "low":
        return "#ffc107";
      default:
        return "#6c757d";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return "⏳ Pending";
      case "cleared":
        return "✅ Cleared";
      case "confirmed":
        return "❌ Confirmed";
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="anti-cheat-review-container">
      <div className="anti-cheat-header">
        <h1>🚩 Anti-Cheat Review System</h1>
        <p>Monitor and manage suspicious leaderboard activity</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card pending">
          <div className="card-title">Pending Review</div>
          <div className="card-value">{summary.pending}</div>
        </div>
        <div className="summary-card cleared">
          <div className="card-title">Cleared</div>
          <div className="card-value">{summary.cleared}</div>
        </div>
        <div className="summary-card confirmed">
          <div className="card-title">Confirmed Cases</div>
          <div className="card-value">{summary.confirmed}</div>
        </div>
        <div className="summary-card high">
          <div className="card-title">High Risk</div>
          <div className="card-value">{summary.high}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
            <option value="confirmed">Confirmed</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Severity</label>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">All Levels</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Student name or LeetCode username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="refresh-button" onClick={fetchFlags} disabled={isLoading}>
          🔄 Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="loading-state">Loading anti-cheat flags...</div>
      ) : filteredFlags.length === 0 ? (
        <div className="empty-state">
          <p>No anti-cheat flags found</p>
          {flags.length > 0 && (
            <p className="empty-note">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <div className="flags-list">
          <div className="flags-header">
            <span>Student</span>
            <span>Type</span>
            <span>Severity</span>
            <span>Detected</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {filteredFlags.map((flag) => (
            <div key={flag.id} className="flag-row">
              <div className="flag-student">
                <img
                  src={
                    flag.profile?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      flag.student_name || "Student"
                    )}&background=ffdddd&color=d71920`
                  }
                  alt={flag.student_name}
                  className="student-avatar"
                />
                <div>
                  <div className="student-name">{flag.student_name}</div>
                  <div className="student-username">@{flag.leetcode_username}</div>
                </div>
              </div>

              <div className="flag-type">{flag.flag_type.replace(/_/g, " ")}</div>

              <div className="flag-severity">
                <span
                  className="severity-badge"
                  style={{ backgroundColor: getSeverityColor(flag.severity) }}
                >
                  {flag.severity}
                </span>
              </div>

              <div className="flag-detected">{formatDate(flag.detected_at)}</div>

              <div className="flag-status">
                <span className={`status-badge status-${flag.status}`}>
                  {getStatusBadge(flag.status)}
                </span>
              </div>

              <div className="flag-action">
                <button
                  className="details-button"
                  onClick={() => openDetails(flag)}
                  disabled={actionInProgress}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedFlag && (
        <AntiCheatDetailsModal
          flag={selectedFlag}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedFlag(null);
          }}
          onClear={handleClearFlag}
          onConfirm={handleConfirmViolation}
          actionInProgress={actionInProgress}
          onNoteChange={(note) =>
            setSelectedFlag({ ...selectedFlag, mentorNote: note })
          }
        />
      )}
    </div>
  );
}

/**
 * Details Modal Component
 */
function AntiCheatDetailsModal({
  flag,
  onClose,
  onClear,
  onConfirm,
  actionInProgress,
  onNoteChange,
}) {
  const evidence = flag.evidence
    ? typeof flag.evidence === "string"
      ? JSON.parse(flag.evidence)
      : flag.evidence
    : {};

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Anti-Cheat Flag Details</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Student Info */}
          <div className="section">
            <h3>Student Information</h3>
            <div className="student-info">
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span className="info-value">{flag.student_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">LeetCode:</span>
                <span className="info-value">@{flag.leetcode_username}</span>
              </div>
            </div>
          </div>

          {/* Flag Details */}
          <div className="section">
            <h3>Flag Details</h3>
            <div className="flag-details">
              <div className="info-row">
                <span className="info-label">Type:</span>
                <span className="info-value">{flag.flag_type.replace(/_/g, " ")}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Severity:</span>
                <span
                  className="info-value"
                  style={{
                    color: flag.severity === "high" ? "#dc3545" : flag.severity === "medium" ? "#fd7e14" : "#ffc107",
                  }}
                >
                  {flag.severity.toUpperCase()}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Detected:</span>
                <span className="info-value">{formatDate(flag.detected_at)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Reason:</span>
                <span className="info-value">{flag.reason}</span>
              </div>
            </div>
          </div>

          {/* Evidence */}
          {Object.keys(evidence).length > 0 && (
            <div className="section">
              <h3>Evidence</h3>
              <div className="evidence-details">
                {evidence.difference && (
                  <div className="evidence-item">
                    <strong>Problems Solved:</strong> {evidence.difference}
                  </div>
                )}
                {evidence.timeDifferenceMinutes && (
                  <div className="evidence-item">
                    <strong>Time Window:</strong> {Math.round(evidence.timeDifferenceMinutes)} minutes
                  </div>
                )}
                {evidence.easyDifference !== undefined && (
                  <div className="evidence-item">
                    <strong>Easy (+):</strong> {evidence.easyDifference}
                  </div>
                )}
                {evidence.mediumDifference !== undefined && (
                  <div className="evidence-item">
                    <strong>Medium (+):</strong> {evidence.mediumDifference}
                  </div>
                )}
                {evidence.hardDifference !== undefined && (
                  <div className="evidence-item">
                    <strong>Hard (+):</strong> {evidence.hardDifference}
                  </div>
                )}
                {evidence.scoreIncrease && (
                  <div className="evidence-item">
                    <strong>Score Increase:</strong> +{evidence.scoreIncrease} points ({evidence.percentageIncrease?.toFixed(1)}%)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mentor Note */}
          {flag.status === "pending" && (
            <div className="section">
              <h3>Mentor Review Notes</h3>
              <textarea
                className="note-input"
                placeholder="Add your review notes here..."
                value={flag.mentorNote || ""}
                onChange={(e) => onNoteChange(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {/* Existing Review */}
          {flag.mentor_note && flag.status !== "pending" && (
            <div className="section">
              <h3>Mentor Review</h3>
              <div className="review-info">
                <div className="info-row">
                  <span className="info-label">Decision:</span>
                  <span className="info-value">
                    {flag.status === "cleared" ? "✅ Cleared" : "❌ Confirmed"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reviewed:</span>
                  <span className="info-value">{formatDate(flag.reviewed_at)}</span>
                </div>
                <div className="note-display">{flag.mentor_note}</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        {flag.status === "pending" && (
          <div className="modal-footer">
            <button
              className="button-secondary"
              onClick={onClose}
              disabled={actionInProgress}
            >
              Cancel
            </button>
            <button
              className="button-clear"
              onClick={onClear}
              disabled={actionInProgress === "confirming"}
            >
              {actionInProgress === "clearing" ? "Clearing..." : "✅ Clear Flag"}
            </button>
            <button
              className="button-confirm"
              onClick={onConfirm}
              disabled={actionInProgress === "clearing"}
            >
              {actionInProgress === "confirming" ? "Confirming..." : "❌ Confirm Violation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AntiCheatReview;
