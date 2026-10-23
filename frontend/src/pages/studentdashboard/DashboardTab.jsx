import { useState, useEffect, useMemo } from "react";
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
  Target,
  BadgeCheck
} from "lucide-react";
import { getGitHubStats, getLeetCodeStats } from "../../api/routes/StudentDashboard/dashboard";
import { getMyExceptionRequests } from "../../api/routes/StudentDashboard/exception";
import { getLeaderboardData } from "../../api/routes/Public/leaderboard";
import RequestException from "./RequestException";
import MonthlyActivityGraph from "./MonthlyActivityGraph";
import "./RequestException.css";
import {
  isRecentlyActive,
  lastSolvedFromLeetcodeStats,
} from "../../utils/activity";
import "./DashboardTab.css";

// ----------------------------------------------------------------------
// Custom Hook: Fetch and manage external coding stats
// ----------------------------------------------------------------------
function useDashboardStats(githubUrl, leetcodeUrl, profile) {
  const [githubData, setGithubData] = useState(null);
  const [leetcodeData, setLeetcodeData] = useState(null);
  const [websiteLeaderboard, setWebsiteLeaderboard] = useState([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [hasAcceptedException, setHasAcceptedException] = useState(false);
  const [acceptedUntil, setAcceptedUntil] = useState(null);
  useEffect(() => {
    if (!profile) return;
    let isMounted = true;

    async function loadStats() {
      setIsStatsLoading(true);
      try {
        const [ghStats, lcStats, leaderboardData, exceptionData] = await Promise.all([
          githubUrl ? getGitHubStats(githubUrl) : null,
          leetcodeUrl ? getLeetCodeStats(leetcodeUrl) : null,
          getLeaderboardData().catch(() => []),
          getMyExceptionRequests().catch(() => null)
        ]);

        if (isMounted) {
          if (ghStats) setGithubData(ghStats);
          if (lcStats) setLeetcodeData(lcStats);
          setWebsiteLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
          setHasAcceptedException(!!exceptionData?.hasAccepted);
          setAcceptedUntil(exceptionData?.acceptedUntil || null);
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

  return { githubData, leetcodeData, websiteLeaderboard, isStatsLoading, hasAcceptedException, acceptedUntil };
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
  const {
    githubData,
    leetcodeData,
    websiteLeaderboard,
    isStatsLoading,
    hasAcceptedException,
    acceptedUntil
  } = useDashboardStats(githubUrl, leetcodeUrl, profile);

  const leaderboardRows = useMemo(() => {
    const sortedLeaderboard = [...websiteLeaderboard].sort((left, right) => {
      const scoreDifference = Number(right?.score ?? 0) - Number(left?.score ?? 0);
      if (scoreDifference !== 0) return scoreDifference;

      const solvedDifference = Number(right?.total_solved ?? 0) - Number(left?.total_solved ?? 0);
      if (solvedDifference !== 0) return solvedDifference;

      return Number(left?.ranking ?? Infinity) - Number(right?.ranking ?? Infinity);
    });

    const currentIndex = sortedLeaderboard.findIndex(
      (entry) => String(entry?.user_id ?? "") === String(profile?.user_id ?? "")
    );

    if (currentIndex < 0) return [];

    return sortedLeaderboard
      .slice(Math.max(0, currentIndex - 1), currentIndex + 2)
      .map((entry) => ({
        ...entry,
        rank: sortedLeaderboard.indexOf(entry) + 1,
        isCurrentUser: String(entry?.user_id ?? "") === String(profile?.user_id ?? "")
      }));
  }, [profile, websiteLeaderboard]);

  const currentLeaderboardEntry = leaderboardRows.find((entry) => entry.isCurrentUser);

  // Activity comes from the most recent accepted submission so a student who
  // solved earlier today still reads as active, even before the daily cron's
  // is_leetcode_active flag catches up. Prefer the live LeetCode payload (already
  // fetched for this page), then fall back to the cached leaderboard value.
  const isCurrentUserActive = useMemo(
    () =>
      isRecentlyActive({
        total_solved:
          currentLeaderboardEntry?.total_solved ??
          leetcodeData?.totalSolved ??
          profile?.total_solved,
        last_solved_at:
          lastSolvedFromLeetcodeStats(leetcodeData) ??
          currentLeaderboardEntry?.last_solved_at,
      }),
    [currentLeaderboardEntry, leetcodeData, profile]
  );

  const acceptedUntilText = acceptedUntil
    ? new Date(acceptedUntil).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  if (isLoading) {
    return (
      <div className="dt-container">
        <div className="dt-social-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pm-profile-card dt-card dt-loading-card">
              <div className="dt-loading-heading">
                <div className="skeleton dt-loading-icon"></div>
                <div className="skeleton skeleton-text width-40"></div>
              </div>
              <div className="dt-loading-lines">
                <div className="skeleton skeleton-text width-100"></div>
                <div className="skeleton skeleton-text width-60"></div>
              </div>
              <div className="skeleton dt-loading-button"></div>
            </div>
          ))}
        </div>

        <div className="dt-dashboard-lower dt-loading-lower">
          <section className="dt-leaderboard-section">
            <div className="dt-loading-leaderboard-heading">
              <div className="skeleton skeleton-text width-40"></div>
              <div className="skeleton skeleton-text width-60"></div>
            </div>
            <div className="dt-loading-leaderboard-columns">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton skeleton-text"></div>
              ))}
            </div>
            <div className="dt-loading-leaderboard-rows">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton dt-loading-leaderboard-row"></div>
              ))}
            </div>
          </section>

          <div className="dt-dashboard-bottom-grid">
            <div className="resume-card dt-loading-panel">
              <div className="skeleton skeleton-text width-40"></div>
              <div className="skeleton skeleton-text width-60"></div>
              <div className="skeleton dt-loading-button"></div>
            </div>
            <div className="dt-activity-card dt-loading-panel">
              <div className="skeleton skeleton-text width-60"></div>
              <div className="skeleton dt-loading-status"></div>
              <div className="skeleton skeleton-text width-100"></div>
            </div>
          </div>
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

      <div className="dt-dashboard-lower">
        <section className="dt-leaderboard-section" aria-labelledby="student-leaderboard-heading">
        <div className="dt-leaderboard-header">
          <div>
            <span className="dt-section-eyebrow">Your standing</span>
            <h3 id="student-leaderboard-heading">Leaderboard</h3>
          </div>
          <span className="dt-leaderboard-caption">Score ranking</span>
        </div>

        <div className="dt-leaderboard-columns" aria-hidden="true">
          <span>Rank</span>
          <span>Student</span>
          <span>Easy</span>
          <span>Medium</span>
          <span>Hard</span>
          <span>Points</span>
        </div>

        {leaderboardRows.length > 0 ? (
          <div className="dt-leaderboard-rows">
            {leaderboardRows.map((entry) => (
              <div
                className={`dt-leaderboard-row ${entry.isCurrentUser ? "is-current" : ""}`}
                key={entry.user_id}
              >
                <span className="dt-leaderboard-rank">#{entry.rank}</span>
                <div className="dt-leaderboard-student">
                  <strong>
                    {entry.profiles?.name || entry.leetcode_username || "Student"}
                  </strong>
                  {entry.isCurrentUser && <span>You</span>}
                </div>
                <span className="dt-leaderboard-number easy-number">{entry.easy_solved ?? 0}</span>
                <span className="dt-leaderboard-number medium-number">{entry.medium_solved ?? 0}</span>
                <span className="dt-leaderboard-number hard-number">{entry.hard_solved ?? 0}</span>
                <span className="dt-leaderboard-number points-number">{entry.score ?? 0}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="dt-leaderboard-empty">Your profile is not ranked yet.</p>
        )}
        </section>

        {/* Monthly Consistency Overview */}
        <section className="dt-monthly-section" aria-labelledby="monthly-consistency-heading">
          <div className="dt-monthly-header">
            <div>
              <span className="dt-section-eyebrow">Monthly Consistency</span>
              <h3 id="monthly-consistency-heading">Your LeetCode consistency</h3>
            </div>
          </div>
          <MonthlyActivityGraph />
        </section>

        <div className="dt-dashboard-bottom-grid">
          <div className="resume-card">
          <div className="resume-header">
            <FileText size={20} color="#3b82f6" />
            <div>
              <h3>Resume Document</h3>
              <span className={`dt-resume-status ${resumeUrl ? "is-linked" : ""}`}>
                {resumeUrl ? "Resume linked" : "Resume not linked"}
              </span>
            </div>
          </div>

          {resumeUrl && <p>{fileName || "Resume Linked"}</p>}

          {resumeUrl && (
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
          )}
          </div>

          <div className="dt-activity-card">
            <div className="dt-activity-card-header">
              <div>
                <span className="dt-section-eyebrow">Your activity</span>
                <h3>LeetCode Status</h3>
              </div>
              <span className="dt-activity-icon"><Flame size={18} /></span>
            </div>
            <p className={`dt-activity-value ${isCurrentUserActive ? "is-active" : "is-inactive"}`}>
              {hasAcceptedException ? "Request accepted" : isCurrentUserActive ? "Active" : "Inactive"}
            </p>
            <span className="dt-activity-description">
              {hasAcceptedException
                ? acceptedUntilText
                  ? `Your mentor accepted your LeetCode exception request. Valid until ${acceptedUntilText}.`
                  : "Your mentor accepted your LeetCode exception request."
                : isCurrentUserActive
                ? "You are currently active on LeetCode."
                : "No recent LeetCode activity detected."}
            </span>
            {hasAcceptedException && (
              <span className="dt-activity-tag"><BadgeCheck size={14} /> Request accepted</span>
            )}
          </div>

          <RequestException />
        </div>
      </div>
    </div>
  );
}