import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Eye,
  Download,
  Code2,
  Globe,
  Link2,
  GitCommit,
  Flame,
  Users,
  ExternalLink,
  Award,
  BookOpen,
  Target
} from "lucide-react";
import { getGitHubStats, getLeetCodeStats } from "../../api/routes/StudentDashboard/dashboard";
import "./DashboardTab.css";

// ----------------------------------------------------------------------
// Custom Hook: Fetch and manage external coding stats
// ----------------------------------------------------------------------
function useDashboardStats(githubUrl, leetcodeUrl, profile) {
  const [githubData, setGithubData] = useState(null);
  const [leetcodeData, setLeetcodeData] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let isMounted = true;

    async function loadStats() {
      setIsStatsLoading(true);
      try {
        const [ghStats, lcStats] = await Promise.all([
          githubUrl ? getGitHubStats(githubUrl) : null,
          leetcodeUrl ? getLeetCodeStats(leetcodeUrl) : null
        ]);

        if (isMounted) {
          if (ghStats) setGithubData(ghStats);
          if (lcStats) setLeetcodeData(lcStats);
        }
      } catch (err) {
        console.error("Error loading dashboard stats from backend:", err);
      } finally {
        if (isMounted) setIsStatsLoading(false);
      }
    }

    loadStats();

    return () => {
      isMounted = false; // Prevent updating state if component unmounts
    };
  }, [githubUrl, leetcodeUrl, profile]);

  return { githubData, leetcodeData, isStatsLoading };
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function DashboardTab({ profile, fileName, isLoading }) {
  // Hook: Parse and memoize external links & handles
  const {
    resumeUrl,
    githubUrl,
    linkedinUrl,
    leetcodeUrl,
    codechefUrl,
    linkedinUsername,
    codechefUsername
  } = useMemo(() => {
    const getSafeExternalUrl = (url) => {
      if (!url) return null;
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
          return parsedUrl.toString();
        }
        return null;
      } catch {
        return null;
      }
    };

    const getLinkedinUsername = (url) => {
      if (!url) return null;
      try {
        const match = url.match(/linkedin\.com\/in\/([^/]+)/);
        return match ? match[1] : "profile";
      } catch {
        return "profile";
      }
    };

    const getCodeChefUsername = (url) => {
      if (!url) return null;
      try {
        const match = url.match(/codechef\.com\/(?:users|profile)\/([^/?#]+)/i);
        return match ? match[1] : "profile";
      } catch {
        return "profile";
      }
    };

    const gh = getSafeExternalUrl(profile?.github);
    const li = getSafeExternalUrl(profile?.linkedin);
    const lc = getSafeExternalUrl(profile?.leetcode);
    const cc = getSafeExternalUrl(profile?.codechef || profile?.codechefUrl || profile?.codechef_url);
    const res = getSafeExternalUrl(profile?.resumeUrl || profile?.resume_url);

    return {
      resumeUrl: res,
      githubUrl: gh,
      linkedinUrl: li,
      leetcodeUrl: lc,
      codechefUrl: cc,
      linkedinUsername: getLinkedinUsername(li),
      codechefUsername: getCodeChefUsername(cc)
    };
  }, [profile]);

  // Hook: Fetch GitHub & LeetCode stats
  const { githubData, leetcodeData, isStatsLoading } = useDashboardStats(
    githubUrl,
    leetcodeUrl,
    profile
  );

  if (isLoading) {
    return (
      <div className="dt-container">
        <div className="dt-social-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pm-profile-card dt-card">
              <div className="skeleton skeleton-text width-40 mb-12" style={{ height: "20px" }}></div>
              <div className="skeleton skeleton-text width-100 mb-16" style={{ height: "16px" }}></div>
              <div className="skeleton skeleton-input" style={{ height: "36px" }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dt-container">
      {/* Overview Cards Row */}
      <div className="dt-social-grid">
        
        {/* GitHub Card */}
        <div className="pm-profile-card dt-card">
          <div className="dt-card-header">
            <div className="dt-icon-wrapper github-icon">
              <Code2 size={20} />
            </div>
            <h3 className="dt-card-title">GitHub</h3>
          </div>
          
          {githubUrl ? (
            <div className="dt-card-body">
              {isStatsLoading ? (
                <div className="dt-stats-skeleton">
                  <div className="skeleton skeleton-text width-60"></div>
                  <div className="skeleton skeleton-text width-80"></div>
                </div>
              ) : githubData ? (
                <>
                  <div className="dt-stats-list">
                    <div className="dt-stat-item">
                      <span className="dt-stat-left"><BookOpen size={15} /> Public Repos</span>
                      <span className="dt-stat-right">{githubData.repos || 0}</span>
                    </div>
                    <div className="dt-stat-item">
                      <span className="dt-stat-left"><Users size={15} /> Followers</span>
                      <span className="dt-stat-right">{githubData.followers || 0}</span>
                    </div>
                  </div>
                  <div className="dt-badge badge-github">
                    <GitCommit size={16} /> 
                    <span className="truncate-text">
                      <strong>Recent:</strong> {githubData.recentRepo || "No recent activity"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="dt-stats-list">
                  <span className="dt-fallback-text">{profile?.github}</span>
                </div>
              )}
              <a 
                href={githubUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="dt-action-btn github-btn"
              >
                <span>View GitHub</span>
                <ExternalLink size={14} />
              </a>
            </div>
          ) : (
            <div className="dt-card-body">
              <p className="dt-fallback-text">Not linked yet</p>
            </div>
          )}
        </div>

        {/* CodeChef Card */}
        <div className="pm-profile-card dt-card">
          <div className="dt-card-header">
            <div className="dt-icon-wrapper codechef-icon">
              <Code2 size={20} />
            </div>
            <h3 className="dt-card-title">CodeChef</h3>
          </div>

          {codechefUrl ? (
            <div className="dt-card-body">
              <div className="dt-stats-list">
                <div className="dt-stat-item">
                  <span className="dt-stat-left">Username</span>
                  <span className="dt-stat-right truncate-text" title={codechefUsername}>
                    @{codechefUsername}
                  </span>
                </div>
                <div className="dt-stat-item">
                  <span className="dt-stat-left">Profile</span>
                  <span className="dt-stat-right truncate-text" title={codechefUrl}>
                    Linked
                  </span>
                </div>
              </div>
              <a
                href={codechefUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="dt-action-btn codechef-btn"
              >
                <span>View CodeChef</span>
                <ExternalLink size={14} />
              </a>
            </div>
          ) : (
            <div className="dt-card-body">
              <p className="dt-fallback-text">Not set</p>
            </div>
          )}
        </div>

        {/* LinkedIn Card */}
        <div className="pm-profile-card dt-card">
          <div className="dt-card-header">
            <div className="dt-icon-wrapper linkedin-icon">
              <Globe size={20} />
            </div>
            <h3 className="dt-card-title">LinkedIn</h3>
          </div>

          {linkedinUrl ? (
            <div className="dt-card-body">
              <div className="dt-stats-list">
                <div className="dt-stat-item">
                  <span className="dt-stat-left">Username</span>
                  <span className="dt-stat-right">@{linkedinUsername}</span>
                </div>
                <div className="dt-stat-item">
                  <span className="dt-stat-left">Profile</span>
                  <span className="dt-stat-right truncate-text" title={linkedinUrl}>
                    Linked
                  </span>
                </div>
              </div>
              <a 
                href={linkedinUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="dt-action-btn linkedin-btn"
              >
                <span>View LinkedIn</span>
                <ExternalLink size={14} />
              </a>
            </div>
          ) : (
            <div className="dt-card-body">
              <p className="dt-fallback-text">Not set</p>
            </div>
          )}
        </div>

        {/* LeetCode Card */}
        <div className="pm-profile-card dt-card">
          <div className="dt-card-header">
            <div className="dt-icon-wrapper leetcode-icon">
              <Link2 size={20} />
            </div>
            <h3 className="dt-card-title">LeetCode</h3>
          </div>

          {leetcodeUrl ? (
            <div className="dt-card-body">
              {isStatsLoading ? (
                <div className="dt-stats-skeleton">
                  <div className="skeleton skeleton-text width-60"></div>
                  <div className="skeleton skeleton-text width-80"></div>
                </div>
              ) : leetcodeData ? (
                <>
                  <div className="dt-stats-list">
                    <div className="dt-stat-item">
                      <span className="dt-stat-left"><Award size={15} /> Solved</span>
                      <span className="dt-stat-right">{leetcodeData.totalSolved || 0}</span>
                    </div>
                    <div className="dt-stat-item">
                      <span className="dt-stat-left"><Target size={15} /> Status</span>
                      <span className="dt-stat-right truncate-text" style={{ maxWidth: "130px" }} title={leetcodeData.currentlyAttempting}>
                        {leetcodeData.currentlyAttempting || "Active"}
                      </span>
                    </div>
                  </div>
                  <div className="dt-badge badge-leetcode">
                    <Flame size={16} /> 
                    <strong>{leetcodeData.easySolved || 0} E | {leetcodeData.mediumSolved || 0} M | {leetcodeData.hardSolved || 0} H</strong>
                  </div>
                </>
              ) : (
                <div className="dt-stats-list">
                  <span className="dt-fallback-text">{profile?.leetcode}</span>
                </div>
              )}
              <a 
                href={leetcodeUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="dt-action-btn leetcode-btn"
              >
                <span>View LeetCode</span>
                <ExternalLink size={14} />
              </a>
            </div>
          ) : (
            <div className="dt-card-body">
              <p className="dt-fallback-text">Not set</p>
            </div>
          )}
        </div>

      </div>

      {/* Quick Summary Section */}
      <div className="dt-status-section">
        <h3 className="dt-status-heading">Profile Quick Status</h3>
        <div className="dt-status-grid">
          <div className="dt-status-item">
            <span className="dt-status-label">SQUAD</span>
            <p className="dt-status-value">{profile?.squad_id || profile?.squadId || "Not Assigned"}</p>
          </div>
          <div className="dt-status-item">
            <span className="dt-status-label">RESUME STATUS</span>
            <p className={`dt-status-value ${resumeUrl ? "is-success" : ""}`}>
              {resumeUrl ? "Linked" : "Missing"}
            </p>
          </div>
          <div className="dt-status-item">
            <span className="dt-status-label">ROLE / TITLE</span>
            <p className="dt-status-value">{profile?.title || "Not Set"}</p>
          </div>
        </div>

        {resumeUrl && (
          <div className="resume-card">
            <div className="resume-header">
              <FileText size={20} color="#3b82f6" />
              <h3>Resume Document</h3>
            </div>

            <p>{fileName || "Resume Linked"}</p>

            <div className="resume-actions">
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="resume-view-btn"
              >
                <Eye size={16}/>
                View Resume
              </a>

              <a
                href={resumeUrl}
                download
                className="resume-download-btn"
              >
                <Download size={16}/>
                Download
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}