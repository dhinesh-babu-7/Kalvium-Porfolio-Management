import "./IndividualStudentPortfolio.css";
import "../components/EmptyState.css";
import { useParams, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getStudentByUserId, getGithubStats, getLeetcodeStats, getStudentProjects, getStudentAchievements } from "../api/routes/Public/StudentInfo.js";
import {
  ExternalLink,
  Trophy,
  Award,
  Shield,
  Code2,
  Briefcase,
  BookOpen,
  Star,
  LoaderCircle,
  ArrowRight,
} from "lucide-react";
import ClampedDescription from "../components/ClampedDescription.jsx";
import { normalizeTeam, projectDetailPath } from "../lib/projectUtils.js";

const ACHIEVEMENT_CATEGORY_ICONS = {
  Certificate: Trophy,
  Award: Award,
  Badge: Shield,
  Hackathon: Code2,
  Internship: Briefcase,
  Course: BookOpen,
  Other: Award,
};

const ACHIEVEMENT_CATEGORY_COLORS = {
  Certificate: "#f59e0b",
  Award: "#10b981",
  Badge: "#3b82f6",
  Hackathon: "#8b5cf6",
  Internship: "#06b6d4",
  Course: "#ec4899",
  Other: "#64748b",
};

export default function IndividualStudentPortfolio() {
  const { user_id } = useParams();

  // 1. All hooks MUST be declared at the top level
    const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStudentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch DB Profile (Fast)
        const profileData = await getStudentByUserId(user_id);
        
        if (!isMounted) return;
        setStudent(profileData);
        setLoading(false);

        // Fetch Live Stats in Parallel
        setStatsLoading(true);

        const pGitHub = profileData?.github 
          ? getGithubStats(profileData.github).catch(() => null) 
          : Promise.resolve(null);
          
        const pLeetCode = profileData?.leetcode 
          ? getLeetcodeStats(profileData.leetcode).catch(() => null) 
          : Promise.resolve(null);

                // Public projects & achievements (non-fatal if they fail)
        setProjects([]); // reset
        setLoadingProjects(true);
        const pProjects = getStudentProjects(user_id).catch(() => []);
        const pAchievements = getStudentAchievements(user_id).catch(() => []);

        const [ghStats, lcStats, publicProjects, publicAchievements] = await Promise.all([
          pGitHub,
          pLeetCode,
          pProjects,
          pAchievements,
        ]);

        if (!isMounted) return;

        if (Array.isArray(publicProjects)) setProjects(publicProjects);
        if (Array.isArray(publicAchievements)) setAchievements(publicAchievements);

        setStudent(prev => ({
          ...prev,
          ...(ghStats && {
            github_repos: ghStats.repos,
            github_followers: ghStats.followers,
          }),
          ...(lcStats && {
            leetcode_rank: lcStats.ranking,
            leetcode_solved: lcStats.totalSolved,
            leetcode_easy: lcStats.easySolved,
            leetcode_medium: lcStats.mediumSolved,
            leetcode_hard: lcStats.hardSolved,
          })
        }));

      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch student data:", err);
          setError("Student not found or failed to load profile.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setStatsLoading(false);
          setLoadingProjects(false);
        }
      }
    };

    if (user_id && user_id !== "undefined") {
      fetchStudentData();
    }

    return () => { isMounted = false; };
  }, [user_id]);

  // 2. Early return moved HERE (after all hooks)
  if (!user_id || user_id === "undefined") {
    return <Navigate to="/students" replace />;
  }

  // Extract email preference
  const displayEmail = student?.personal_email || student?.email;

  // Extract display usernames
  const githubUsername = student?.github_username || student?.github?.split("/").filter(Boolean).pop();
  const leetcodeUsername = student?.leetcode_username || student?.leetcode?.split("/").filter(Boolean).pop();

  // Show only the 3 latest projects. The API already sorts by
  // created_at desc, but we sort defensively so the featured list is
  // correct even if the ordering ever changes.
  const featuredProjects = [...projects]
    .sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  // Helper for displaying stats safely
  const renderStat = (val, fallback = 0) => {
    if (statsLoading) return "...";
    return val ?? fallback;
  };

  // Skeleton Loading UI Component
  if (loading) {
    return (
      <div id="portfolio-background" className="skeleton-container">
        <title>Kalvium Portfolio | Loading</title>

        <div id="left-side-color">
          {[1, 2, 3].map((key) => (
            <div key={key} className="coding-profile-card skeleton-card">
              <div className="skeleton-box skeleton-header"></div>
              <div className="skeleton-box skeleton-text short"></div>
              <div className="skeleton-stats-grid">
                <div className="skeleton-box skeleton-stat"></div>
                <div className="skeleton-box skeleton-stat"></div>
                <div className="skeleton-box skeleton-stat"></div>
              </div>
            </div>
          ))}
        </div>

        <div id="right-side-color">
          <div className="main-content-container">
            <header className="profile-header">
              <div className="profile-identity">
                <div className="skeleton-box skeleton-avatar"></div>
                <div className="profile-titles" style={{ width: "100%" }}>
                  <div className="skeleton-box skeleton-title"></div>
                  <div className="skeleton-box skeleton-subtitle"></div>
                </div>
              </div>
              <div className="skeleton-box skeleton-bio"></div>
            </header>

            <section className="projects-section">
              <div className="skeleton-box skeleton-section-title"></div>
              <div className="skeleton-box skeleton-project-card"></div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // Error State UI
  if (error || !student) {
    return (
      <main className="empty-state">
        <section className="empty-state__card">
          <h1 className="empty-state__title">Student not found</h1>

          <p className="empty-state__body">
            We couldn’t load a portfolio for that student. The profile may have
            been removed, or the link you followed may be out of date.
          </p>

          {error && (
            <p className="empty-state__path">
              Details: <code>{error}</code>
            </p>
          )}

          <div className="empty-state__actions">
            <Link
              className="empty-state__btn empty-state__btn--primary"
              to="/students"
            >
              Browse all students
            </Link>
            <Link className="empty-state__btn empty-state__btn--ghost" to="/">
              Back to home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div id="portfolio-background">
       <title>Kalvium Portfolio | {student.name}</title>

      {/* Left Sidebar */}
      <div id="left-side-color">
        
        {/* LeetCode Profile Card */}
        <div className="coding-profile-card">
          <div className="leetcode-header">
            <svg className="card-header-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.17 5.79a1.375 1.375 0 0 0 .963 2.348h.01a1.37 1.37 0 0 0 .958-.403l4.38-4.38 3.14 3.14a1.376 1.376 0 0 0 1.946-1.946L14.444.438A1.374 1.374 0 0 0 13.483 0zm-6.14 8.35a1.375 1.375 0 0 0-.965.405l-4.95 4.95a3.987 3.987 0 0 0 0 5.638l4.95 4.95a1.375 1.375 0 1 0 1.944-1.944l-4.95-4.95a1.238 1.238 0 0 1 0-1.75l4.95-4.95a1.375 1.375 0 0 0-.979-2.349zm12.308 0a1.375 1.375 0 0 0-.973 2.349l2.5 2.5a1.238 1.238 0 0 1 0 1.75l-7.4 7.4a1.238 1.238 0 0 1-1.75 0l-2.02-2.02a1.375 1.375 0 1 0-1.944 1.944l2.02 2.02a3.987 3.987 0 0 0 5.638 0l7.4-7.4a3.987 3.987 0 0 0 0-5.638l-2.5-2.5a1.374 1.374 0 0 0-.971-.405z" />
            </svg>
            <h2>LeetCode</h2>
          </div>
          {leetcodeUsername && <div className="leetcode-username">@{leetcodeUsername}</div>}

          <div className="leetcode-stats-main">
            <div className="stat-box">
              <span className="stat-label">Rank</span>
              <span className="stat-value-ind-student">{renderStat(student.leetcode_rank, "N/A")}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Solved</span>
              <span className="stat-value-ind-student">{renderStat(student.leetcode_solved)}</span>
            </div>
          </div>

          <div className="leetcode-difficulty">
            <div className="diff-item">
              <span className="diff-label easy">Easy</span>
              <span className="diff-count easy">{renderStat(student.leetcode_easy)}</span>
            </div>
            <div className="diff-item">
              <span className="diff-label medium">Medium</span>
              <span className="diff-count medium">{renderStat(student.leetcode_medium)}</span>
            </div>
            <div className="diff-item">
              <span className="diff-label hard">Hard</span>
              <span className="diff-count hard">{renderStat(student.leetcode_hard)}</span>
            </div>
          </div>
        </div>

        {/* GitHub Profile Card */}
        <div className="coding-profile-card">
          <div className="github-header">
            <svg className="card-header-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <h2>GitHub</h2>
          </div>
          {githubUsername && <div className="github-username">@{githubUsername}</div>}

          <div className="github-stats-main">
            <div className="stat-box">
              <span className="stat-label">Repos</span>
              <span className="stat-value-ind-student">{renderStat(student.github_repos)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Followers</span>
              <span className="stat-value-ind-student">{renderStat(student.github_followers)}</span>
            </div>
          </div>
        </div>

        {/* Contact & Links Card */}
        <div className="coding-profile-card">
          <div className="contact-card-header">
            <svg className="card-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <h2>Contact & Links</h2>
          </div>

          <div className="contact-list">
            {displayEmail && (
              <a href={`mailto:${displayEmail}`} className="contact-item">
                <div className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <div className="contact-details">
                  <span className="contact-label">Email</span>
                  <span className="contact-text">{displayEmail}</span>
                </div>
              </a>
            )}

            {student.linkedin && (
              <a href={student.linkedin} target="_blank" rel="noreferrer" className="contact-item">
                <div className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.72a1.47 1.47 0 1 0 0 2.94 1.47 1.47 0 0 0 0-2.94z" />
                  </svg>
                </div>
                <div className="contact-details">
                  <span className="contact-label">LinkedIn</span>
                  <span className="contact-text">{student.linkedin}</span>
                </div>
              </a>
            )}

            {student.github && (
              <a href={student.github} target="_blank" rel="noreferrer" className="contact-item">
                <div className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div className="contact-details">
                  <span className="contact-label">GitHub</span>
                  <span className="contact-text">{student.github}</span>
                </div>
              </a>
            )}

            {student.leetcode && (
              <a href={student.leetcode} target="_blank" rel="noreferrer" className="contact-item">
                <div className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.17 5.79a1.375 1.375 0 0 0 .963 2.348h.01a1.37 1.37 0 0 0 .958-.403l4.38-4.38 3.14 3.14a1.376 1.376 0 0 0 1.946-1.946L14.444.438A1.374 1.374 0 0 0 13.483 0zm-6.14 8.35a1.375 1.375 0 0 0-.965.405l-4.95 4.95a3.987 3.987 0 0 0 0 5.638l4.95 4.95a1.375 1.375 0 1 0 1.944-1.944l-4.95-4.95a1.238 1.238 0 0 1 0-1.75l4.95-4.95a1.375 1.375 0 0 0-.979-2.349zm12.308 0a1.375 1.375 0 0 0-.973 2.349l2.5 2.5a1.238 1.238 0 0 1 0 1.75l-7.4 7.4a1.238 1.238 0 0 1-1.75 0l-2.02-2.02a1.375 1.375 0 1 0-1.944 1.944l2.02 2.02a3.987 3.987 0 0 0 5.638 0l7.4-7.4a3.987 3.987 0 0 0 0-5.638l-2.5-2.5a1.374 1.374 0 0 0-.971-.405z" />
                  </svg>
                </div>
                <div className="contact-details">
                  <span className="contact-label">LeetCode</span>
                  <span className="contact-text">{student.leetcode}</span>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Right Main Content */}
      <div id="right-side-color">
        <div className="main-content-container">
          <header className="profile-header">
            <div className="profile-identity">
              <div className="profile-avatar">
                <img
                  src={
                    student.avatar_url?.trim()
                      ? student.avatar_url
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          student.name || "Student"
                        )}&background=0D8ABC&color=fff&size=256`
                  }
                  alt={student.name || "Student Avatar"}
                  className="profile-avatar-img"
                />
              </div>
              <div className="profile-titles">
                <h1 className="student-name">{student.name}</h1>
                {student.title && <h2 className="student-title">{student.title}</h2>}
              </div>
            </div>

            {student.bio && <p className="student-bio">{student.bio}</p>}
          </header>

          <section className="projects-section">
            <h3 className="section-title">Featured Projects</h3>
            {loadingProjects ? (
              <div className="project-grid-loader">
                <LoaderCircle className="spinner-icon" />
                <span>Loading projects...</span>
              </div>
            ) : featuredProjects.length === 0 ? (
              <div className="coming-soon-card">
                <div className="coming-soon-icon">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="3"></circle>
                    <polyline points="12 11 12 13 13 13"></polyline>
                  </svg>
                </div>
                <h4 className="coming-soon-title">Projects Coming Soon</h4>
                <p className="coming-soon-desc">
                  This developer is currently working on exciting new projects. Check back soon to see their latest work!
                </p>
              </div>
            ) : (
              <>
                <div className="public-projects-grid">
                  {featuredProjects.map((proj) => {
                    const teamMembers = normalizeTeam(proj.team);
                    const repoUrl = proj.github_repo || proj.github_url;
                    const projectTitle = proj.project_title || proj.name;
                    const detailPath = projectDetailPath(user_id, proj);
                    return (
                      <article key={proj.id} className="public-project-card">
                        <h4 className="public-project-title">
                          {projectTitle}
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
                      </article>
                    );
                  })}
                </div>

                {projects.length > 3 && (
                  <div className="view-projects-wrapper">
                    <Link
                      to={`/portfolio/${user_id}/projects`}
                      className="view-projects-btn"
                    >
                      View All Projects
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="projects-section">
            <h3 className="section-title">Achievements</h3>
            {loadingProjects ? (
              <div className="project-grid-loader">
                <LoaderCircle className="spinner-icon" />
                <span>Loading achievements...</span>
              </div>
            ) : achievements.length === 0 ? (
              <div className="coming-soon-card">
                <div className="coming-soon-icon">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6"></circle>
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
                  </svg>
                </div>
                <h4 className="coming-soon-title">No Achievements Yet</h4>
                <p className="coming-soon-desc">
                  This developer hasn&apos;t showcased any achievements yet. Check back soon to see their latest accomplishments!
                </p>
              </div>
            ) : (
              <div className="public-achievements-grid">
                {achievements.map((ach) => {
                  const IconComponent =
                    ACHIEVEMENT_CATEGORY_ICONS[ach.category] || Star;
                  const color =
                    ACHIEVEMENT_CATEGORY_COLORS[ach.category] || "#64748b";
                  return (
                    <article key={ach.id} className="public-achievement-card">
                      <div className="public-achievement-header">
                        <div
                          className="public-achievement-icon"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          <IconComponent size={22} />
                        </div>
                      </div>
                      <h4 className="public-achievement-title">{ach.title}</h4>
                      {ach.description && (
                        <ClampedDescription
                          text={ach.description}
                          className="public-achievement-desc"
                        />
                      )}
                      <div className="public-project-meta">
                        <span
                          className="public-achievement-category"
                          style={{ color }}
                        >
                          {ach.category}
                        </span>
                        {ach.external_url && (
                          <a
                            href={ach.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="public-project-view"
                          >
                            <ExternalLink size={14} /> View
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="contact-section">
            <h3 className="section-title">Get In Touch</h3>
            <p className="contact-intro">
              Feel free to reach out if you'd like to collaborate, discuss potential opportunities, or connect!
            </p>

            <div className="contact-actions">
              {displayEmail && (
                <a href={`mailto:${displayEmail}`} className="action-btn primary-btn">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  Send Email
                </a>
              )}

              {student.resume_url && (
                <a href={student.resume_url} target="_blank" rel="noreferrer" className="action-btn secondary-btn">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  View Resume
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}