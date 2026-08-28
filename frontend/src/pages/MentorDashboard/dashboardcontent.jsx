import React, { useState, useEffect } from "react";
import {
  Users,
  ArrowRight,
  Search,
  ExternalLink,
  FileText,
  Code2,
  Mail,
  X,
  Loader2,
  Activity,
  GitCommit,
  CheckCircle2,
  Clock,
  FolderGit2
} from "lucide-react";

import { useCodingStats } from "../../hooks/useCodingStats"; 
import { getStudents } from "../../api/routes/MentorDashboard/main"; 
import "./dashboardcontent.css";

// Brand SVG Icons
const LinkedinIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const DashboardContent = ({ onViewStudents }) => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSquad, setSelectedSquad] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { 
    github: githubStats, 
    leetcode: leetcodeStats, 
    loading: isFetchingStats 
  } = useCodingStats(selectedStudent?.github, selectedStudent?.leetcode);

  useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoading(true);
      try {
        const response = await getStudents();
        // FIX: Extract the students array from the API response object
        setStudents(response?.students || []);
      } catch (error) {
        console.error("Failed to load student data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  const availableSquads = [
    "all",
    ...Array.from(new Set(students.map((s) => s.squad_id).filter(Boolean))),
  ];

  const filteredStudents = students.filter((student) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      student.name?.toLowerCase().includes(query) ||
      student.kalvium_email?.toLowerCase().includes(query) ||
      student.personal_email?.toLowerCase().includes(query) ||
      student.title?.toLowerCase().includes(query);

    const matchesSquad =
      selectedSquad === "all" || String(student.squad_id) === String(selectedSquad);

    return matchesSearch && matchesSquad;
  });

  // Check if there is any activity available to render
  const hasGitHubActivity = githubStats?.recentRepo || (githubStats?.recentEvents?.length > 0);
  const hasLeetCodeActivity = leetcodeStats?.recentSubmissions?.length > 0;
  const hasAnyActivity = hasGitHubActivity || hasLeetCodeActivity;

  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>Mentor Dashboard</h1>
        <p>Track your squad allocations, and profile links.</p>
      </header>

      {/* Top Overview Card */}
      <div className="stats-row">
        <div className="stats-card">
          <div className="stats-icon">
            <Users size={24} color="#64748b" />
          </div>

          <span className="stats-label">Total Students</span>

          {isLoading ? (
            <div className="skeleton skeleton-stat-num" />
          ) : (
            <h2>{students.length}</h2>
          )}
          <p>Students under your selected squad(s).</p>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (onViewStudents) onViewStudents();
              const el = document.getElementById("students-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span>View Students</span>
            <ArrowRight size={16} color="#ffffff" />
          </button>
        </div>
      </div>

      {/* Student Roster Table Section */}
      <section id="students-section" className="students-section">
        <div className="students-section-header">
          <div>
            <h2>Student Roster</h2>
            <p>Click on any student name to view coding profiles and live stats.</p>
          </div>

          <div className="students-controls">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search name, email, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {availableSquads.length > 2 && (
              <select
                className="squad-select"
                value={selectedSquad}
                onChange={(e) => setSelectedSquad(e.target.value)}
              >
                <option value="all">All Squads</option>
                {availableSquads
                  .filter((sq) => sq !== "all")
                  .map((sq) => (
                    <option key={sq} value={sq}>
                      Squad {sq}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>

        {/* Table View */}
        {isLoading ? (
          <div className="table-skeleton">
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Squad</th>
                  <th>Role / Title</th>
                  <th>Kalvium Email</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id || student.user_id}>
                    <td>
                      <button
                        type="button"
                        className="table-student-name"
                        onClick={() => setSelectedStudent(student)}
                      >
                        {student.name}
                      </button>
                    </td>
                    <td>
                      {student.squad_id ? (
                        <span className="squad-badge">Squad {student.squad_id}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{student.title || <span className="text-muted">—</span>}</td>
                    <td>
                      {student.kalvium_email || student.personal_email ? (
                        <div className="table-email">
                          <Mail size={13} />
                          <span>{student.kalvium_email || student.personal_email}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => setSelectedStudent(student)}
                      >
                        View Stats & Links
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-students-state">
            <p>No students found matching your criteria.</p>
          </div>
        )}
      </section>

      {/* Modal Popup */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title-row">
                  <h2>{selectedStudent.name}</h2>
                  {selectedStudent.squad_id && (
                    <span className="squad-badge">Squad {selectedStudent.squad_id}</span>
                  )}
                </div>
                {selectedStudent.title && (
                  <p className="modal-role">{selectedStudent.title}</p>
                )}
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedStudent(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {selectedStudent.bio && (
                <p className="modal-bio">"{selectedStudent.bio}"</p>
              )}

              {/* Contact Details */}
              <div className="modal-info-group">
                <h4>Contact Details</h4>
                {selectedStudent.kalvium_email && (
                  <div className="meta-item">
                    <Mail size={14} />
                    <span>Kalvium: {selectedStudent.kalvium_email}</span>
                  </div>
                )}
                {selectedStudent.personal_email && (
                  <div className="meta-item">
                    <Mail size={14} />
                    <span>Personal: {selectedStudent.personal_email}</span>
                  </div>
                )}
              </div>

              {/* Coding Profiles & Live Stats */}
              <div className="modal-info-group">
                <div className="group-title-row">
                  <h4>Coding Profiles & Live Stats</h4>
                  {isFetchingStats && (
                    <span className="fetching-indicator">
                      <Loader2 size={12} className="spin-icon" /> Fetching stats...
                    </span>
                  )}
                </div>

                <div className="modal-links-grid">
                  {/* LeetCode Card */}
                  {selectedStudent.leetcode && (
                    <div className="modal-link-card leetcode">
                      <div className="card-main">
                        <Code2 size={18} />
                        <div className="card-info">
                          <div className="card-title-row">
                            <strong>LeetCode</strong>
                            <a
                              href={selectedStudent.leetcode}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Profile <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Solved Pills */}
                      {leetcodeStats && (
                        <div className="api-stats-pills">
                          {leetcodeStats.totalSolved !== undefined && (
                            <span className="stat-pill primary">
                              Solved: <strong>{leetcodeStats.totalSolved}</strong>
                            </span>
                          )}
                          {leetcodeStats.easySolved !== undefined && (
                            <span className="stat-pill easy">
                              Easy: {leetcodeStats.easySolved}
                            </span>
                          )}
                          {leetcodeStats.mediumSolved !== undefined && (
                            <span className="stat-pill medium">
                              Med: {leetcodeStats.mediumSolved}
                            </span>
                          )}
                          {leetcodeStats.hardSolved !== undefined && (
                            <span className="stat-pill hard">
                              Hard: {leetcodeStats.hardSolved}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* GitHub Card */}
                  {selectedStudent.github && (
                    <div className="modal-link-card github">
                      <div className="card-main">
                        <GithubIcon size={18} />
                        <div className="card-info">
                          <div className="card-title-row">
                            <strong>GitHub</strong>
                            <a
                              href={selectedStudent.github}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Repositories <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* GitHub Stats Pills */}
                      {githubStats && ( 
                        <div className="api-stats-pills">
                          {githubStats.followers !== undefined && (
                            <span className="stat-pill primary">
                              Followers: <strong>{githubStats.followers}</strong>
                            </span>
                          )}
                          {(githubStats.repos !== undefined || githubStats.public_repos !== undefined) && (
                            <span className="stat-pill">
                              Repos: <strong>{githubStats.repos ?? githubStats.public_repos}</strong>
                            </span>
                          )}
                          {githubStats.contributions !== undefined && (
                            <span className="stat-pill">
                              Contributions: <strong>{githubStats.contributions}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LinkedIn */}
                  {selectedStudent.linkedin && (
                    <div className="modal-link-card linkedin">
                      <div className="card-main">
                        <LinkedinIcon size={18} />
                        <div className="card-info">
                          <div className="card-title-row">
                            <strong>LinkedIn</strong>
                            <a
                              href={selectedStudent.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Profile <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resume */}
                  {selectedStudent.resume_url && (
                    <div className="modal-link-card resume">
                      <div className="card-main">
                        <FileText size={18} />
                        <div className="card-info">
                          <div className="card-title-row">
                            <strong>Resume</strong>
                            <a
                              href={selectedStudent.resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View PDF Resume <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RECENT ACTIVITY SECTION */}
              <div className="modal-info-group">
                <div className="group-title-row">
                  <h4>Recent Activity</h4>
                  <Activity size={14} className="activity-heading-icon" />
                </div>

                {isFetchingStats ? (
                  <div className="activity-skeleton">
                    <div className="skeleton skeleton-row" />
                  </div>
                ) : (
                  <div className="activity-timeline">
                    {/* GitHub Recent Repo Support */}
                    {githubStats?.recentRepo && (
                      <div className="activity-item github-activity">
                        <FolderGit2 size={15} className="activity-icon gh-icon" />
                        <div className="activity-details">
                          <span className="activity-title">
                            Updated project <strong>{githubStats.recentRepo}</strong>
                          </span>
                          <span className="activity-meta">
                            <Clock size={11} /> Latest Repository • GitHub
                          </span>
                        </div>
                      </div>
                    )}

                    {/* GitHub Recent Events (Array) */}
                    {githubStats?.recentEvents?.length > 0 &&
                      githubStats.recentEvents.slice(0, 2).map((evt, idx) => (
                        <div key={`gh-${idx}`} className="activity-item github-activity">
                          <GitCommit size={15} className="activity-icon gh-icon" />
                          <div className="activity-details">
                            <span className="activity-title">
                              {evt.message || evt.description || "Pushed code update"}
                            </span>
                            <span className="activity-meta">
                              <Clock size={11} /> {evt.timeAgo || "Recently"} • {evt.repoName || "GitHub"}
                            </span>
                          </div>
                        </div>
                      ))}

                    {/* LeetCode Recent Submissions */}
                    {leetcodeStats?.recentSubmissions?.length > 0 &&
                      leetcodeStats.recentSubmissions.slice(0, 2).map((sub, idx) => (
                        <div key={`lc-${idx}`} className="activity-item leetcode-activity">
                          <CheckCircle2 size={15} className="activity-icon lc-icon" />
                          <div className="activity-details">
                            <span className="activity-title">
                              Solved <strong>{sub.title}</strong>
                            </span>
                            <span className="activity-meta">
                              <Clock size={11} /> {sub.timeAgo || "Recently"} • LeetCode
                            </span>
                          </div>
                        </div>
                      ))}

                    {/* Fallback */}
                    {!hasAnyActivity && (
                      <p className="no-links-text">No recent submission or commit activity found.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;