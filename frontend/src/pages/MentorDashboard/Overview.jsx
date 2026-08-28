import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Search, Filter, ExternalLink, Code2, Mail, CheckCircle2, UserX, Users,
  Layers, X, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Clock,
  Calendar, FileCode2, Globe, Link2, Download,
} from "lucide-react";

import { getsquadsOverview } from "../../api/routes/MentorDashboard/main.js";
import { getGithubStats, getLeetcodeStats, getAllStudents } from "../../api/routes/Public/StudentInfo.js";

import "./overview.css";

// ==========================================
// SVG ICON COMPONENTS
// ==========================================
const GithubIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const getStudentEmail = (student) => {
  if (!student) return "N/A";
  return student.kalvium_email || student.personal_email || student.email || "N/A";
};

const cleanLeetcodeHandle = (student) => {
  if (!student) return "";

  if (typeof student === "string") {
    let cleaned = student.trim().replace(/\/+$/, "");
    if (cleaned.includes("leetcode.com")) {
      const segments = cleaned.split("/").filter(Boolean);
      cleaned = segments[segments.length - 1];
    }
    return cleaned.replace(/^@/, "");
  }

  const rawHandle =
    student.leetcode ??
    student.leetcode_handle ??
    student.leetcode_url ??
    student.leetcode_username ??
    student.leetcodeHandle ??
    student.leetcodeUrl ??
    student.leetcode_id ??
    "";

  if (!rawHandle) return "";

  let cleaned = String(rawHandle).trim().replace(/\/+$/, "");
  if (cleaned.includes("leetcode.com")) {
    const segments = cleaned.split("/").filter(Boolean);
    cleaned = segments[segments.length - 1];
  }
  return cleaned.replace(/^@/, "");
};

const formatProfileUrl = (value, baseUrl) => {
  if (!value) return null;
  const val = String(value).trim();
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  return baseUrl ? `${baseUrl.replace(/\/+$/, "")}/${val.replace(/^@/, "")}` : val;
};

const isStudentActive = (student) => {
  if (!student) return false;
  const totalSolved = Number(student.total_solved ?? student.totalSolved ?? 0);
  if (totalSolved <= 0) return false;

  if (student.is_leetcode_active) return true;

  if (student.last_solved_at) {
    const lastSolved = new Date(student.last_solved_at);
    if (!isNaN(lastSolved.getTime())) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return lastSolved.getTime() >= sevenDaysAgo;
    }
  }
  return false;
};

const is1DayInactiveStudent = (student) => {
  if (!student?.last_solved_at) return false;
  const totalSolved = Number(student.total_solved ?? student.totalSolved ?? 0);
  if (totalSolved <= 0) return false;

  const lastSolved = new Date(student.last_solved_at);
  if (isNaN(lastSolved.getTime())) return false;

  const diffInMs = Date.now() - lastSolved.getTime();
  return diffInMs > 24 * 60 * 60 * 1000 && diffInMs <= 7 * 24 * 60 * 60 * 1000;
};

const formatDateTime = (rawTime) => {
  if (!rawTime) return { dateStr: "N/A", timeStr: "N/A", fullStr: "N/A" };
  const dateObj = new Date(rawTime);
  if (isNaN(dateObj.getTime())) return { dateStr: "N/A", timeStr: "N/A", fullStr: "N/A" };

  return {
    dateStr: dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    timeStr: dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    fullStr: `${dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} at ${dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`,
  };
};

export default function Overview() {
  const [students, setStudents] = useState([]);
  const [endpointSquads, setEndpointSquads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSquad, setSelectedSquad] = useState("all"); 
  const [filterStatus, setFilterStatus] = useState("all"); 

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Cache to hold lazily-loaded table statistics for E/M/H breakdown
  const [tableStatsCache, setTableStatsCache] = useState({});

  // Rate-limiting toast notification state
  const [toastMessage, setToastMessage] = useState(null);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [statsData, setStatsData] = useState({ github: null, leetcode: null });
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [squadsRes, studentsRes] = await Promise.all([
          getsquadsOverview().catch(() => ({ squads: [] })),
          getAllStudents().catch(() => []),
        ]);

        setEndpointSquads(squadsRes.squads || []);
        const studentsData = studentsRes?.data || studentsRes?.students || (Array.isArray(studentsRes) ? studentsRes : []);
        setStudents(studentsData);
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const safeStudents = useMemo(() => (Array.isArray(students) ? students : []), [students]);

  const availableSquads = useMemo(() => {
    const squadSet = new Set(endpointSquads);
    safeStudents.forEach((s) => {
      if (s.squad_id) squadSet.add(s.squad_id);
    });

    return Array.from(squadSet).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b));
    });
  }, [endpointSquads, safeStudents]);

  const filteredStudents = useMemo(() => {
    return safeStudents.filter((student) => {
      const squadId = student.squad_id ?? "N/A";
      if (selectedSquad !== "all" && String(squadId) !== String(selectedSquad)) return false;

      const active = isStudentActive(student);
      const is1DayInactive = is1DayInactiveStudent(student);

      if (filterStatus === "active" && (!active || is1DayInactive)) return false;
      if (filterStatus === "1day_inactive" && !is1DayInactive) return false;
      if (filterStatus === "inactive" && active) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const cleanLc = cleanLeetcodeHandle(student).toLowerCase();
        const studentEmailStr = getStudentEmail(student).toLowerCase();
        
        return (
          (student.name || "").toLowerCase().includes(query) ||
          studentEmailStr.includes(query) ||
          String(squadId).includes(query) ||
          cleanLc.includes(query)
        );
      }
      return true;
    });
  }, [safeStudents, searchQuery, selectedSquad, filterStatus]);

  const totalStudentsCount = safeStudents.length;
  const activeStudentsCount = useMemo(() => safeStudents.filter((s) => isStudentActive(s) && !is1DayInactiveStudent(s)).length, [safeStudents]);
  const oneDayInactiveCount = useMemo(() => safeStudents.filter((s) => is1DayInactiveStudent(s)).length, [safeStudents]);
  const inactiveStudentsCount = useMemo(() => safeStudents.filter((s) => !isStudentActive(s)).length, [safeStudents]);
  const currentSquadsCount = availableSquads.length;

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedSquad, filterStatus]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = useMemo(() => filteredStudents.slice(startIndex, startIndex + itemsPerPage), [filteredStudents, startIndex]);

  // Export filtered students list to Excel spreadsheet with automatic column widths
  const handleExportToExcel = () => {
    const exportData = filteredStudents.map((student) => {
      const studentId = student.user_id || student.id;
      const cachedStats = tableStatsCache[studentId] || {};
      const easyCount = cachedStats.easy ?? student.easy_solved ?? student.easySolved ?? 0;
      const mediumCount = cachedStats.medium ?? student.medium_solved ?? student.mediumSolved ?? 0;
      const hardCount = cachedStats.hard ?? student.hard_solved ?? student.hardSolved ?? 0;

      const active = isStudentActive(student);
      const is1DayInactive = is1DayInactiveStudent(student);
      let statusStr = "Inactive";
      if (is1DayInactive) statusStr = "1-6 Day Inactive";
      else if (active) statusStr = "Active";

      return {
        "Student Name": student.name || "Unknown",
        "Squad": student.squad_id ?? "N/A",
        "Registered Email": getStudentEmail(student),
        "LeetCode Handle": cleanLeetcodeHandle(student) || "N/A",
        "Total Solved": student.total_solved ?? student.totalSolved ?? 0,
        "Easy Solved": easyCount,
        "Medium Solved": mediumCount,
        "Hard Solved": hardCount,
        "LeetCode Status": statusStr,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Calculate maximum character length per column and set auto-width
    if (exportData.length > 0) {
      const keys = Object.keys(exportData[0]);
      worksheet["!cols"] = keys.map((key) => {
        const maxLen = exportData.reduce((max, row) => {
          const value = row[key] !== null && row[key] !== undefined ? String(row[key]) : "";
          return Math.max(max, value.length);
        }, key.length);

        return { wch: maxLen + 3 };
      });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students Overview");
    XLSX.writeFile(workbook, `Students_Overview_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ==========================================
  // LAZY LOAD E/M/H STATS WITH THROTTLING & RATE-LIMIT CATCHING
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    const fetchMissingStats = async () => {
      if (paginatedStudents.length === 0) return;

      const updatedCache = { ...tableStatsCache };

      for (const student of paginatedStudents) {
        if (!isMounted) break;

        const studentId = student.user_id || student.id;
        const cleanHandle = cleanLeetcodeHandle(student);

        if (updatedCache[studentId] || !cleanHandle) continue;

        try {
          const res = await getLeetcodeStats(`https://leetcode.com/u/${cleanHandle}`);
          
          if (res && !res.error) {
            const newStats = {
              easy: res.easySolved ?? 0,
              medium: res.mediumSolved ?? 0,
              hard: res.hardSolved ?? 0,
            };

            updatedCache[studentId] = newStats;

            if (isMounted) {
              setTableStatsCache((prev) => ({ ...prev, [studentId]: newStats }));
            }
          }
        } catch (err) {
          const is429 = err?.response?.status === 429 || String(err?.message).includes("429");
          if (is429) {
            if (isMounted) {
              triggerToast("LeetCode API rate limit reached (429). Automatic fetching paused for remaining profiles.");
            }
            break;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    };

    fetchMissingStats();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedStudents]);

  const handleOpenInfoModal = async (student) => {
    setSelectedStudent(student);
    setLoadingStats(true);
    setStatsError(null);
    setStatsData({ github: null, leetcode: null });

    try {
      const githubUrl = formatProfileUrl(student.github, "https://github.com");
      const cleanLcHandle = cleanLeetcodeHandle(student);
      const leetcodeUrl = cleanLcHandle ? `https://leetcode.com/u/${cleanLcHandle}` : null;

      const [githubRes, leetcodeRes] = await Promise.all([
        githubUrl ? getGithubStats(githubUrl).catch(() => ({ error: "Failed to load GitHub" })) : Promise.resolve(null),
        leetcodeUrl ? getLeetcodeStats(leetcodeUrl).catch((err) => {
          if (err?.response?.status === 429) {
            triggerToast("Rate limit hit! Failed to load modal statistics.");
          }
          return { error: "Failed to load LeetCode" };
        }) : Promise.resolve(null),
      ]);

      setStatsData({ github: githubRes, leetcode: leetcodeRes });
    } catch (err) {
      setStatsError("An error occurred while fetching platform statistics.");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
    setStatsData({ github: null, leetcode: null });
    setStatsError(null);
  };

  const recentSubmissions = useMemo(() => {
    if (!selectedStudent) return [];
    const lc = statsData.leetcode || {};
    const rawList = lc.recentSubmissions || lc.recent_submissions || [];

    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.map((item) => ({
        title: item.title || item.titleSlug || "Solved Question",
        difficulty: item.difficulty || "Medium",
        status: item.statusDisplay || "Accepted",
        timestamp: item.timestamp || Date.now(),
        url: item.titleSlug ? `https://leetcode.com/problems/${item.titleSlug}/` : "https://leetcode.com/",
      }));
    }
    return [];
  }, [statsData.leetcode, selectedStudent]);

  const getOtherProfiles = (student) => {
    if (!student) return [];
    const profiles = [];
    if (student.github) profiles.push({ label: "GitHub", url: formatProfileUrl(student.github, "https://github.com"), icon: <GithubIcon size={14} /> });
    const cleanLc = cleanLeetcodeHandle(student);
    if (cleanLc) profiles.push({ label: "LeetCode", url: `https://leetcode.com/u/${cleanLc}`, icon: <Code2 size={14} /> });
    if (student.linkedin) profiles.push({ label: "LinkedIn", url: formatProfileUrl(student.linkedin, "https://linkedin.com/in"), icon: <LinkedinIcon size={14} /> });
    if (student.codeforces) profiles.push({ label: "Codeforces", url: formatProfileUrl(student.codeforces, "https://codeforces.com/profile"), icon: <Code2 size={14} /> });
    if (student.codechef) profiles.push({ label: "CodeChef", url: formatProfileUrl(student.codechef, "https://www.codechef.com/users"), icon: <Code2 size={14} /> });
    if (student.hackerrank) profiles.push({ label: "HackerRank", url: formatProfileUrl(student.hackerrank, "https://www.hackerrank.com/profile"), icon: <Code2 size={14} /> });
    if (student.geeksforgeeks || student.gfg) profiles.push({ label: "GeeksforGeeks", url: formatProfileUrl(student.geeksforgeeks || student.gfg, "https://auth.geeksforgeeks.org/user"), icon: <Code2 size={14} /> });
    if (student.portfolio || student.website) profiles.push({ label: "Portfolio", url: formatProfileUrl(student.portfolio || student.website, null), icon: <Globe size={14} /> });
    return profiles;
  };

  return (
    <div className="dashboard-layout" style={{ position: "relative" }}>
      {/* Rate Limit Toast Warning Banner */}
      {toastMessage && (
        <div className="toast-warning-banner">
          <div className="toast-content">
            <AlertCircle size={18} className="toast-icon" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="toast-close-btn">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="stats-grid">
        <div className={`stat-card ${filterStatus === "all" ? "active-filter" : ""}`} onClick={() => setFilterStatus("all")} style={{ cursor: "pointer" }}>
          <div className="stat-icon icon-blue"><Users size={22} /></div>
          <div className="stat-details">
            <span className="stat-label">Students across Squads</span>
            {loading ? <div className="skeleton-box skeleton-text short mt-1"></div> : <span className="stat-value">{totalStudentsCount}</span>}
          </div>
        </div>

        <div className={`stat-card ${filterStatus === "active" ? "active-filter" : ""}`} onClick={() => setFilterStatus("active")} style={{ cursor: "pointer" }}>
          <div className="stat-icon icon-green"><CheckCircle2 size={22} /></div>
          <div className="stat-details">
            <span className="stat-label">LeetCode Active</span>
            {loading ? <div className="skeleton-box skeleton-text short mt-1"></div> : <span className="stat-value">{activeStudentsCount}</span>}
          </div>
        </div>

        <div className={`stat-card ${filterStatus === "1day_inactive" ? "active-filter" : ""}`} onClick={() => setFilterStatus("1day_inactive")} style={{ cursor: "pointer" }}>
          <div className="stat-icon icon-purple"><Clock size={22} /></div>
          <div className="stat-details">
            <span className="stat-label">1-6 Day Inactive</span>
            {loading ? <div className="skeleton-box skeleton-text short mt-1"></div> : <span className="stat-value">{oneDayInactiveCount}</span>}
          </div>
        </div>

        <div className={`stat-card ${filterStatus === "inactive" ? "active-filter" : ""}`} onClick={() => setFilterStatus("inactive")} style={{ cursor: "pointer" }}>
          <div className="stat-icon icon-red"><UserX size={22} /></div>
          <div className="stat-details">
            <span className="stat-label">LeetCode Inactive</span>
            {loading ? <div className="skeleton-box skeleton-text short mt-1"></div> : <span className="stat-value">{inactiveStudentsCount}</span>}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-blue"><Layers size={22} /></div>
          <div className="stat-details">
            <span className="stat-label">Total Squads</span>
            {loading ? <div className="skeleton-box skeleton-text short mt-1"></div> : <span className="stat-value">{currentSquadsCount}</span>}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-card">
        {/* Search & Squad Toolbar */}
        <div className="content-toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <Search size={18} className="text-muted" />
              <input type="text" placeholder="Search name, email, handle or squad..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loading} />
            </div>

            <div className="filter-box">
              <Filter size={18} className="text-muted" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} disabled={loading}>
                <option value="all">All Statuses</option>
                <option value="active">Active (Last 7 Days)</option>
                <option value="1day_inactive">1-6 Day Inactive</option>
                <option value="inactive">Inactive (&gt; 7 Days)</option>
              </select>
            </div>

            <div className="filter-box">
              <Layers size={18} className="text-muted" />
              <select value={selectedSquad} onChange={(e) => setSelectedSquad(e.target.value)} disabled={loading}>
                <option value="all">All Squads {loading ? "" : `(${currentSquadsCount})`}</option>
                {availableSquads.map((sq) => (
                  <option key={sq} value={sq}>Squad {sq}</option>
                ))}
              </select>
            </div>

            {/* Export to Excel Button */}
            <button
              className="btn-secondary"
              onClick={handleExportToExcel}
              disabled={loading || filteredStudents.length === 0}
            >
              <Download size={16} /> Export to Excel
            </button>
          </div>
        </div>

        {/* Data List Table */}
        <div className="table-wrapper">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Squad</th>
                <th>Registered Email</th>
                <th>LeetCode Handle</th>
                <th>Total Solved (E/M/H)</th>
                <th>LeetCode Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    <td>
                      <div className="student-profile-cell">
                        <div className="skeleton-box skeleton-avatar"></div>
                        <div className="skeleton-box skeleton-text"></div>
                      </div>
                    </td>
                    <td><div className="skeleton-box skeleton-text short"></div></td>
                    <td><div className="skeleton-box skeleton-text long"></div></td>
                    <td><div className="skeleton-box skeleton-text"></div></td>
                    <td><div className="skeleton-box skeleton-text"></div></td>
                    <td><div className="skeleton-box skeleton-text short"></div></td>
                    <td><div className="skeleton-box skeleton-btn"></div></td>
                  </tr>
                ))
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-table-state">
                    <div className="empty-message">
                      <AlertCircle size={32} />
                      <p>No students match the specified search or squad criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const studentId = student.user_id || student.id;
                  const active = isStudentActive(student);
                  const is1DayInactive = is1DayInactiveStudent(student);
                  const cleanHandle = cleanLeetcodeHandle(student);

                  const cachedStats = tableStatsCache[studentId] || {};
                  const easyCount = cachedStats.easy ?? student.easy_solved ?? student.easySolved ?? 0;
                  const mediumCount = cachedStats.medium ?? student.medium_solved ?? student.mediumSolved ?? 0;
                  const hardCount = cachedStats.hard ?? student.hard_solved ?? student.hardSolved ?? 0;

                  return (
                    <tr key={studentId}>
                      <td data-label="Student Name">
                        <div className="student-profile-cell">
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt={student.name} className="student-avatar-img" />
                          ) : (
                            <div className="student-avatar generic-avatar">
                              {(student.name || "S").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="student-name" title={student.name || "Unknown"}>
                            {student.name || "Unknown"}
                          </span>
                        </div>
                      </td>

                      <td data-label="Squad">
                        <span className="squad-badge">Squad {student.squad_id ?? "N/A"}</span>
                      </td>

                      <td data-label="Registered Email">
                        <div className="table-email">
                          <Mail size={14} className="text-muted" />
                          <span title={getStudentEmail(student)}>
                            {getStudentEmail(student)}
                          </span>
                        </div>
                      </td>

                      <td data-label="LeetCode Handle">
                        {cleanHandle ? (
                          <a href={`https://leetcode.com/u/${cleanHandle}`} target="_blank" rel="noreferrer" className="platform-chip" title={`@${cleanHandle}`}>
                            <Code2 size={12} /> @{cleanHandle}
                          </a>
                        ) : (
                          <span className="no-platforms-label">Not Provided</span>
                        )}
                      </td>

                      <td data-label="Total Solved (E/M/H)">
                        <div className="solved-stats-cell">
                          <span className="total-solved-badge">{student.total_solved ?? student.totalSolved ?? 0}</span>
                          <span className="emh-breakdown">
                            ({easyCount}E / {mediumCount}M / {hardCount}H)
                          </span>
                        </div>
                      </td>

                      <td data-label="LeetCode Status">
                        {is1DayInactive ? (
                          <span className="status-badge warning"><Clock size={14} /> 1-6 Day Inactive</span>
                        ) : active ? (
                          <span className="status-badge active"><CheckCircle2 size={14} /> Active</span>
                        ) : (
                          <span className="status-badge inactive"><UserX size={14} /> Inactive</span>
                        )}
                      </td>

                      <td data-label="Action" className="text-right">
                        <button className="btn-secondary btn-sm" onClick={() => handleOpenInfoModal(student)}>
                          <ExternalLink size={14} /> View Stats
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="table-pagination">
          <div className="pagination-info">
            Showing {filteredStudents.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
          </div>
          <div className="pagination-controls">
            <button className="btn-pagination" disabled={currentPage === 1 || loading} onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}>
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="page-number-display">Page {currentPage} of {totalPages}</span>
            <button className="btn-pagination" disabled={currentPage >= totalPages || loading} onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Student Stats Modal */}
      {selectedStudent && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card modal-card-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                {selectedStudent.avatar_url ? (
                  <img src={selectedStudent.avatar_url} alt={selectedStudent.name} className="student-avatar-img" />
                ) : (
                  <div className="student-avatar generic-avatar">
                    {(selectedStudent.name || "S").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="modal-title-row">
                    <h3>{selectedStudent.name || "Unknown Student"}</h3>
                    <span className="squad-badge">Squad {selectedStudent.squad_id ?? "N/A"}</span>
                  </div>
                  <p className="subtext">{getStudentEmail(selectedStudent)}</p>
                </div>
              </div>
              <button className="icon-btn" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <div className="modal-body">
              {loadingStats ? (
                <div className="empty-message" style={{ padding: "3rem 0" }}>
                  <RefreshCw size={32} className="spin-icon" />
                  <p>Fetching developer stats for {selectedStudent.name}...</p>
                </div>
              ) : statsError ? (
                <div className="status-badge inactive">{statsError}</div>
              ) : (
                <>
                  <div className="modal-section">
                    <span className="section-title">Linked Developer & Social Profiles</span>
                    {getOtherProfiles(selectedStudent).length === 0 ? (
                      <p className="no-platforms-label">No external profiles linked.</p>
                    ) : (
                      <div className="profile-chips-grid">
                        {getOtherProfiles(selectedStudent).map((prof, idx) => (
                          <a key={idx} href={prof.url} target="_blank" rel="noreferrer" className="platform-chip modal-profile-chip">
                            {prof.icon} {prof.label} <Link2 size={12} className="text-muted" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="modal-section">
                    <span className="section-title">GitHub Overview</span>
                    {!selectedStudent.github ? (
                      <p className="no-platforms-label">No GitHub profile linked.</p>
                    ) : statsData.github?.error ? (
                      <p className="text-muted">{statsData.github.error}</p>
                    ) : (
                      <div className="contact-grid">
                        <div className="contact-item">
                          <GithubIcon size={18} />
                          <div>
                            <span className="contact-label">Public Repos</span>
                            <span className="contact-value">{statsData.github?.repos ?? "N/A"}</span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <GithubIcon size={18} />
                          <div>
                            <span className="contact-label">Followers</span>
                            <span className="contact-value">{statsData.github?.followers ?? "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modal-section">
                    <span className="section-title">LeetCode Overview</span>
                    {!cleanLeetcodeHandle(selectedStudent) ? (
                      <p className="no-platforms-label">No LeetCode profile linked.</p>
                    ) : statsData.leetcode?.error ? (
                      <p className="text-muted">{statsData.leetcode.error}</p>
                    ) : (
                      <div className="contact-grid">
                        <div className="contact-item">
                          <Code2 size={18} />
                          <div>
                            <span className="contact-label">Total Solved</span>
                            <span className="contact-value">
                              {statsData.leetcode?.totalSolved ?? selectedStudent.total_solved ?? selectedStudent.totalSolved ?? "0"}
                            </span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <Code2 size={18} />
                          <div>
                            <span className="contact-label">Easy / Med / Hard</span>
                            <span className="contact-value">
                              {statsData.leetcode?.easySolved ?? selectedStudent.easy_solved ?? selectedStudent.easySolved ?? 0} /{" "}
                              {statsData.leetcode?.mediumSolved ?? selectedStudent.medium_solved ?? selectedStudent.mediumSolved ?? 0} /{" "}
                              {statsData.leetcode?.hardSolved ?? selectedStudent.hard_solved ?? selectedStudent.hardSolved ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modal-section">
                    <div className="section-header-flex">
                      <span className="section-title">RECENTLY SOLVED QUESTIONS</span>
                      {selectedStudent.last_solved_at && (
                        <span className="subtext">
                          Last Solved: {formatDateTime(selectedStudent.last_solved_at).fullStr}
                        </span>
                      )}
                    </div>

                    <div className="questions-detail-table-wrapper">
                      <table className="responsive-table questions-table">
                        <thead>
                          <tr>
                            <th>Question Title</th>
                            <th>Difficulty</th>
                            <th>Status</th>
                            <th>Date Solved</th>
                            <th>Exact Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentSubmissions.length > 0 ? (
                            recentSubmissions.map((item, idx) => {
                              const { dateStr, timeStr } = formatDateTime(item.timestamp);
                              const difficultyClass = item.difficulty.toLowerCase().includes("easy") ? "easy" : item.difficulty.toLowerCase().includes("hard") ? "hard" : "medium";

                              return (
                                <tr key={idx}>
                                  <td data-label="Question Title">
                                    <div className="question-title-cell">
                                      <FileCode2 size={14} className="text-muted" />
                                      <a href={item.url} target="_blank" rel="noreferrer" className="question-link">{item.title}</a>
                                    </div>
                                  </td>
                                  <td data-label="Difficulty"><span className={`difficulty-badge ${difficultyClass}`}>{item.difficulty}</span></td>
                                  <td data-label="Status"><span className="status-badge active"><CheckCircle2 size={12} /> {item.status}</span></td>
                                  <td data-label="Date Solved">
                                    <div className="time-info-cell"><Calendar size={13} className="text-muted" /><span>{dateStr}</span></div>
                                  </td>
                                  <td data-label="Exact Time">
                                    <div className="time-info-cell"><Clock size={13} className="text-muted" /><span>{timeStr}</span></div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ textAlign: "center", padding: "1rem" }}>
                                <div className="empty-message-box" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
                                  <AlertCircle size={18} className="text-muted" />
                                  <span>No recent submission</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}