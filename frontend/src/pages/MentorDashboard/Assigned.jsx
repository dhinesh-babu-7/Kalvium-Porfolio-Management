import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Filter,
  Plus,
  Trash2,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Code2,
  UserPlus,
  Zap,
  CheckSquare,
  Calendar,
  FileCode2,
} from "lucide-react";

// API Services Imported from main.js
import {
  getSquads,
  getAssignedStudents,
  getStudents,
  assignStudent,
  unassignStudent,
  assignBulkStudents,
} from "../../api/routes/MentorDashboard/main.js";

import { getGithubStats, getLeetcodeStats } from "../../api/routes/Public/StudentInfo.js";

import "./assigned.css";

// ==========================================
// SVG ICON COMPONENTS FOR GITHUB & LINKEDIN
// ==========================================
const GithubIcon = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// ==========================================
// ACTIVITY & DATE HELPER FUNCTIONS
// ==========================================

const isStudentActive = (student) => {
  if (!student) return false;

  const totalSolved = Number(
    student.total_solved ??
      student.totalSolved ??
      student.leetcode_total_solved ??
      student.total ??
      0
  );

  if (totalSolved <= 0) return false;

  const isActiveFlag =
    student.is_leetcode_active === true ||
    student.is_leetcode_active === 1 ||
    student.is_leetcode_active === "true" ||
    student.is_leetcode_active === "1";

  if (isActiveFlag) return true;

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
  if (!student || !student.last_solved_at) return false;

  const totalSolved = Number(
    student.total_solved ??
      student.totalSolved ??
      student.leetcode_total_solved ??
      student.total ??
      0
  );

  if (totalSolved <= 0) return false;

  const lastSolved = new Date(student.last_solved_at);
  if (isNaN(lastSolved.getTime())) return false;

  const diffInMs = Date.now() - lastSolved.getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  return diffInMs > twentyFourHoursMs && diffInMs <= sevenDaysMs;
};

const formatDateTime = (rawTime) => {
  if (!rawTime) return { dateStr: "N/A", timeStr: "N/A", fullStr: "N/A" };
  let dateObj;

  if (typeof rawTime === "number" || !isNaN(Number(rawTime))) {
    const num = Number(rawTime);
    dateObj = new Date(num > 1e11 ? num : num * 1000);
  } else {
    dateObj = new Date(rawTime);
  }

  if (isNaN(dateObj.getTime())) return { dateStr: "N/A", timeStr: "N/A", fullStr: "N/A" };

  return {
    dateStr: dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    timeStr: dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
    fullStr: `${dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })} at ${dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`,
  };
};

export default function Assigned() {
  // Data States
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [mentorSquads, setMentorSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedSquadFilter, setSelectedSquadFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal States
  const [selectedStudentForStats, setSelectedStudentForStats] = useState(null);
  const [statsData, setStatsData] = useState({ github: null, leetcode: null });
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [modalSquadFilter, setModalSquadFilter] = useState("all");
  const [modalSearch, setModalSearch] = useState("");

  // Fetch Dashboard Data with array normalization
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [squadsData, assignedData, allStudentsData] = await Promise.all([
        getSquads(),
        getAssignedStudents(),
        getStudents(),
      ]);

      // Normalize array extraction for responses wrapped in objects
      const squadsList = Array.isArray(squadsData)
        ? squadsData
        : Array.isArray(squadsData?.squads)
        ? squadsData.squads
        : [];

      const assignedList = Array.isArray(assignedData)
        ? assignedData
        : Array.isArray(assignedData?.students)
        ? assignedData.students
        : Array.isArray(assignedData?.data)
        ? assignedData.data
        : [];

      const allStudentsList = Array.isArray(allStudentsData)
        ? allStudentsData
        : Array.isArray(allStudentsData?.students)
        ? allStudentsData.students
        : Array.isArray(allStudentsData?.data)
        ? allStudentsData.data
        : [];

      setMentorSquads(squadsList);
      setAssignedStudents(assignedList);
      setAllStudents(allStudentsList);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setMentorSquads([]);
      setAssignedStudents([]);
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, selectedSquadFilter, searchQuery]);

  // Handlers
  const handleOpenStatsModal = async (student) => {
    setSelectedStudentForStats(student);
    setLoadingStats(true);
    setStatsError(null);
    setStatsData({ github: null, leetcode: null });

    try {
      const formatPlatformUrl = (val, baseUrl) => {
        if (!val) return null;
        if (val.startsWith("http")) return val;
        return `${baseUrl}/${val}`;
      };

      const githubUrl = formatPlatformUrl(
        student.github || student.github_url,
        "https://github.com"
      );
      const leetcodeUrl = formatPlatformUrl(
        student.leetcode || student.leetcode_url,
        "https://leetcode.com/u"
      );

      const githubPromise = githubUrl
        ? getGithubStats(githubUrl).catch((err) => ({
            error: err?.response?.data?.message || "Failed to load GitHub stats",
          }))
        : Promise.resolve(null);

      const leetcodePromise = leetcodeUrl
        ? getLeetcodeStats(leetcodeUrl).catch((err) => ({
            error: err?.response?.data?.message || "Failed to load LeetCode stats",
          }))
        : Promise.resolve(null);

      const [githubRes, leetcodeRes] = await Promise.all([
        githubPromise,
        leetcodePromise,
      ]);

      setStatsData({
        github: githubRes,
        leetcode: leetcodeRes,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStatsError("An error occurred while fetching platform statistics.");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCloseStatsModal = () => {
    setSelectedStudentForStats(null);
    setStatsData({ github: null, leetcode: null });
    setStatsError(null);
  };

  const handleAssignStudent = async (studentUserId, squadId) => {
    setActionLoadingId(studentUserId);
    try {
      await assignStudent(studentUserId, squadId);
      await fetchDashboardData();
    } catch (err) {
      console.error("Assign error:", err);
      alert(err?.response?.data?.message || "Failed to assign student");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnassignStudent = async (studentUserId) => {
    if (!window.confirm("Are you sure you want to unassign this student?")) return;

    setActionLoadingId(studentUserId);
    try {
      await unassignStudent(studentUserId);
      await fetchDashboardData();
    } catch (err) {
      console.error("Unassign error:", err);
      alert(err?.response?.data?.message || "Failed to unassign student");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBulkAssignSquad = async (squadIdToAssign, unassignedStudentsInSquad) => {
    if (!unassignedStudentsInSquad || unassignedStudentsInSquad.length === 0) return;

    const confirmMsg = `Are you sure you want to assign ALL ${unassignedStudentsInSquad.length} student(s) from Squad ${squadIdToAssign} to your roster in a single click?`;
    if (!window.confirm(confirmMsg)) return;

    setBulkAssigning(true);
    try {
      const studentList = unassignedStudentsInSquad.map((student) => ({
        student_user_id: student.user_id || student.id,
        squad_id: student.squad_id || squadIdToAssign,
      }));

      await assignBulkStudents(studentList);
      await fetchDashboardData();
    } catch (err) {
      console.error("Bulk assign error:", err);
      alert("An error occurred during bulk assignment.");
    } finally {
      setBulkAssigning(false);
    }
  };

  // Safe Arrays for Memoization Guards
  const safeAssignedStudents = useMemo(
    () => (Array.isArray(assignedStudents) ? assignedStudents : []),
    [assignedStudents]
  );

  const safeAllStudents = useMemo(
    () => (Array.isArray(allStudents) ? allStudents : []),
    [allStudents]
  );

  const safeMentorSquads = useMemo(
    () => (Array.isArray(mentorSquads) ? mentorSquads : []),
    [mentorSquads]
  );

  // Computed Metrics
  const activeCount = useMemo(
    () => safeAssignedStudents.filter((s) => isStudentActive(s) && !is1DayInactiveStudent(s)).length,
    [safeAssignedStudents]
  );

  const oneDayInactiveCount = useMemo(
    () => safeAssignedStudents.filter((s) => is1DayInactiveStudent(s)).length,
    [safeAssignedStudents]
  );

  const inactiveCount = useMemo(
    () => safeAssignedStudents.filter((s) => !isStudentActive(s)).length,
    [safeAssignedStudents]
  );

  const filteredStudents = useMemo(() => {
    return safeAssignedStudents.filter((student) => {
      if (
        selectedSquadFilter !== "all" &&
        String(student.squad_id) !== String(selectedSquadFilter)
      ) {
        return false;
      }

      const active = isStudentActive(student);
      const is1DayInactive = is1DayInactiveStudent(student);

      if (filterStatus === "active" && (!active || is1DayInactive)) return false;
      if (filterStatus === "1day_inactive" && !is1DayInactive) return false;
      if (filterStatus === "inactive" && active) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const nameMatch = student.name?.toLowerCase().includes(query);
        const emailMatch = student.email?.toLowerCase().includes(query);
        const squadMatch = String(student.squad_id ?? "").includes(query);
        return nameMatch || emailMatch || squadMatch;
      }

      return true;
    });
  }, [safeAssignedStudents, selectedSquadFilter, filterStatus, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const assignedUserIds = useMemo(
    () => new Set(safeAssignedStudents.map((s) => s.student_user_id || s.user_id || s.id)),
    [safeAssignedStudents]
  );

  const unassignedStudents = useMemo(() => {
    return safeAllStudents.filter((student) => {
      const studentId = student.user_id || student.id;
      if (assignedUserIds.has(studentId)) return false;

      if (
        modalSquadFilter !== "all" &&
        String(student.squad_id) !== String(modalSquadFilter)
      ) {
        return false;
      }

      if (modalSearch.trim() !== "") {
        const q = modalSearch.toLowerCase();
        const nameMatch = student.name?.toLowerCase().includes(q);
        const emailMatch = student.email?.toLowerCase().includes(q);
        return nameMatch || emailMatch;
      }

      return true;
    });
  }, [safeAllStudents, assignedUserIds, modalSquadFilter, modalSearch]);

  // Robustly extract or generate recent submissions array
  const recentSubmissions = useMemo(() => {
    if (!selectedStudentForStats) return [];

    const lc = statsData.leetcode || {};
    const totalSolved = Number(
      selectedStudentForStats.total_solved ??
        selectedStudentForStats.totalSolved ??
        lc.totalSolved ??
        lc.total_solved ??
        0
    );

    if (totalSolved <= 0) return [];

    // 1. Check direct arrays from standard LeetCode API wrappers
    const rawList =
      lc.recentSubmissions ||
      lc.recent_submissions ||
      lc.recentSubmissionList ||
      lc.recentQuestions ||
      lc.recent_solved ||
      lc.recent ||
      lc.submissions ||
      lc.questions ||
      lc.data?.recentSubmissionList ||
      lc.data?.recentSubmissions ||
      lc.data?.matchedUser?.recentSubmissionList ||
      selectedStudentForStats.recentSubmissions ||
      selectedStudentForStats.recent_submissions ||
      selectedStudentForStats.submissions ||
      selectedStudentForStats.leetcode_recent_submissions;

    if (Array.isArray(rawList) && rawList.length > 0) {
      const normalizedList = rawList.filter((item) => {
        const title = item?.title || item?.titleSlug || item?.questionTitle || item?.name || item?.question;
        return title && !/^no recent/i.test(String(title).trim());
      });

      if (normalizedList.length > 0) {
        return normalizedList.map((item) => ({
          title: item.title || item.titleSlug || item.questionTitle || item.name || item.question || "Solved Question",
          difficulty: item.difficulty || item.level || item.diff || "Medium",
          status: item.statusDisplay || item.status || "Accepted",
          timestamp: item.timestamp || item.solvedAt || item.date || item.last_solved_at || Date.now(),
          url: item.url || (item.titleSlug ? `https://leetcode.com/problems/${item.titleSlug}/` : item.title ? `https://leetcode.com/problems/${String(item.title).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}/` : "https://leetcode.com/"),
          titleSlug: item.titleSlug || item.slug || "",
        }));
      }
    }

    // 2. Fallback: If no submission array exists, build record from timestamp/question fields
    const qTitle =
      selectedStudentForStats.last_solved_question ||
      selectedStudentForStats.last_question_title ||
      selectedStudentForStats.last_question ||
      selectedStudentForStats.last_solved_problem ||
      selectedStudentForStats.last_problem ||
      selectedStudentForStats.last_solved ||
      lc.lastSolvedQuestion ||
      lc.last_solved_question ||
      lc.last_solved_title ||
      lc.last_question ||
      lc.recentSubmissions?.[0]?.title ||
      lc.recentSubmissionList?.[0]?.title;

    const lastTimestamp =
      selectedStudentForStats.last_solved_at ||
      selectedStudentForStats.last_active_at ||
      selectedStudentForStats.last_solved_timestamp ||
      lc.lastSolvedAt ||
      lc.last_solved_at ||
      lc.timestamp ||
      lc.recentSubmissions?.[0]?.timestamp ||
      lc.recentSubmissionList?.[0]?.timestamp;

    if (qTitle || lastTimestamp) {
      const titleString =
        typeof qTitle === "string"
          ? qTitle
          : qTitle?.title || qTitle?.name || "Recent LeetCode Submission";

      const normalizedTitle = typeof titleString === "string" ? titleString.trim() : "";
      if (!normalizedTitle || /^no recent/i.test(normalizedTitle)) {
        return [];
      }

      const qSlug =
        selectedStudentForStats.last_solved_slug ||
        selectedStudentForStats.last_slug ||
        lc.lastSolvedSlug ||
        lc.last_solved_slug ||
        normalizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const qUrl =
        selectedStudentForStats.last_solved_url ||
        selectedStudentForStats.last_url ||
        lc.last_solved_url ||
        lc.lastSolvedUrl ||
        (qSlug ? `https://leetcode.com/problems/${qSlug}/` : "https://leetcode.com/");

      const qDiff =
        selectedStudentForStats.last_solved_difficulty ||
        selectedStudentForStats.difficulty ||
        lc.last_solved_difficulty ||
        lc.lastSolvedDifficulty ||
        "Medium";

      return [
        {
          title: titleString,
          difficulty: qDiff,
          status: "Accepted",
          timestamp: lastTimestamp || Date.now(),
          url: qUrl,
          titleSlug: qSlug,
        },
      ];
    }

    return [];
  }, [statsData.leetcode, selectedStudentForStats]);

  if (loading) {
    return (
      <div className="full-page-loader">
        <RefreshCw className="spin-icon" size={32} />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div
          className={`metric-card interactive ${filterStatus === "all" ? "active-filter" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          <div className="metric-icon bg-blue">
            <Users size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Total Assigned</span>
            <span className="metric-value">{safeAssignedStudents.length}</span>
          </div>
        </div>

        <div
          className={`metric-card interactive ${filterStatus === "active" ? "active-filter" : ""}`}
          onClick={() => setFilterStatus("active")}
        >
          <div className="metric-icon bg-green">
            <UserCheck size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Active (7 Days)</span>
            <span className="metric-value">{activeCount}</span>
          </div>
        </div>

        <div
          className={`metric-card interactive ${filterStatus === "1day_inactive" ? "active-filter" : ""}`}
          onClick={() => setFilterStatus("1day_inactive")}
        >
          <div className="metric-icon bg-amber">
            <Clock size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-label">1-6 Day Inactive</span>
            <span className="metric-value">{oneDayInactiveCount}</span>
            <span className="metric-hint">&gt; 24h Idle</span>
          </div>
        </div>

        <div
          className={`metric-card interactive ${filterStatus === "inactive" ? "active-filter" : ""}`}
          onClick={() => setFilterStatus("inactive")}
        >
          <div className="metric-icon bg-red">
            <UserX size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Inactive (&gt; 7 Days)</span>
            <span className="metric-value">{inactiveCount}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-card">
        {/* Toolbar Header */}
        <div className="content-toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                placeholder="Search by name, email, or squad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-box">
              <Filter size={18} className="text-muted" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Last 7 Days)</option>
                <option value="1day_inactive">1-Day Inactive (&gt; 24h)</option>
                <option value="inactive">Inactive (&gt; 7 Days)</option>
              </select>
            </div>

            <div className="filter-box">
              <Users size={18} className="text-muted" />
              <select
                value={selectedSquadFilter}
                onChange={(e) => setSelectedSquadFilter(e.target.value)}
              >
                <option value="all">All Mentor Squads</option>
                {safeMentorSquads.map((squadId) => (
                  <option key={squadId} value={squadId}>
                    Squad {squadId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={() => setIsAssignModalOpen(true)}
          >
            <UserPlus size={18} />
            <span>Assign Students</span>
          </button>
        </div>

        {/* Assigned Table */}
        <div className="table-wrapper">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Squad</th>
                <th>LeetCode Activity</th>
                <th>Platforms</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-table-state">
                    <div className="empty-message">
                      <AlertCircle size={32} />
                      <p>No assigned students match your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const studentId = student.student_user_id || student.user_id || student.id;
                  const active = isStudentActive(student);
                  const is1DayInactive = is1DayInactiveStudent(student);

                  return (
                    <tr key={studentId}>
                      <td data-label="Student">
                        <div className="student-profile-cell">
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt={student.name}
                              className="student-avatar-img"
                            />
                          ) : (
                            <div className="student-avatar generic-avatar">
                              {student.name?.charAt(0) || "S"}
                            </div>
                          )}
                          <div className="student-info">
                            <span className="student-name">{student.name}</span>
                            <span className="email-text">{student.email}</span>
                          </div>
                        </div>
                      </td>

                      <td data-label="Squad">
                        <span className="squad-badge">
                          Squad {student.squad_id || "N/A"}
                        </span>
                      </td>

                      <td data-label="LeetCode Activity">
                        {is1DayInactive ? (
                          <span className="status-badge warning">
                            <Clock size={14} /> 1-Day Inactive
                          </span>
                        ) : active ? (
                          <span className="status-badge active">
                            <CheckCircle2 size={14} /> Active
                          </span>
                        ) : (
                          <span className="status-badge inactive">
                            <UserX size={14} /> Inactive
                          </span>
                        )}
                      </td>

                      <td data-label="Platforms">
                        <div className="platform-chips-container">
                          {(student.leetcode || student.leetcode_url) && (
                            <a
                              href={
                                (student.leetcode || student.leetcode_url).startsWith("http")
                                  ? student.leetcode || student.leetcode_url
                                  : `https://leetcode.com/u/${student.leetcode}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="platform-chip"
                            >
                              <Code2 size={12} /> LeetCode
                            </a>
                          )}
                          {(student.github || student.github_url) && (
                            <a
                              href={
                                (student.github || student.github_url).startsWith("http")
                                  ? student.github || student.github_url
                                  : `https://github.com/${student.github}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="platform-chip"
                            >
                              <GithubIcon size={12} /> GitHub
                            </a>
                          )}
                          {(student.codechef || student.codechef_url) && (
                            <a
                              href={
                                (student.codechef || student.codechef_url).startsWith("http")
                                  ? student.codechef || student.codechef_url
                                  : `https://www.codechef.com/users/${student.codechef}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="platform-chip"
                            >
                              <Code2 size={12} /> CodeChef
                            </a>
                          )}
                          {(student.linkedin || student.linkedin_url) && (
                            <a
                              href={
                                (student.linkedin || student.linkedin_url).startsWith("http")
                                  ? student.linkedin || student.linkedin_url
                                  : `https://linkedin.com/in/${student.linkedin}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="platform-chip"
                            >
                              <LinkedinIcon size={12} /> LinkedIn
                            </a>
                          )}
                          {!student.leetcode &&
                            !student.leetcode_url &&
                            !student.github &&
                            !student.github_url &&
                            !student.codechef &&
                            !student.codechef_url &&
                            !student.linkedin &&
                            !student.linkedin_url && (
                              <span className="no-platforms-label">No profiles linked</span>
                            )}
                        </div>
                      </td>

                      <td data-label="Actions" className="text-right">
                        <div className="actions-cell">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleOpenStatsModal(student)}
                          >
                            <ExternalLink size={14} /> View Stats
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            disabled={actionLoadingId === studentId}
                            onClick={() => handleUnassignStudent(studentId)}
                          >
                            {actionLoadingId === studentId ? (
                              <RefreshCw size={14} className="spin-icon" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Unassign
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredStudents.length > 0 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of{" "}
              {filteredStudents.length} students
            </span>
            <div className="pagination-controls">
              <button
                className="btn-secondary btn-sm pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn-secondary btn-sm pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title-row">
                <UserPlus size={20} className="text-muted" />
                <h3>Assign Students to Roster</h3>
              </div>
              <button
                className="icon-btn"
                onClick={() => setIsAssignModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-filters">
              <div className="search-box">
                <Search size={16} className="text-muted" />
                <input
                  type="text"
                  placeholder="Filter unassigned students..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />
              </div>

              <div className="filter-box">
                <Users size={16} className="text-muted" />
                <select
                  value={modalSquadFilter}
                  onChange={(e) => setModalSquadFilter(e.target.value)}
                >
                  <option value="all">Filter by Squad...</option>
                  {safeMentorSquads.map((squadId) => (
                    <option key={squadId} value={squadId}>
                      Squad {squadId}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {modalSquadFilter !== "all" && (
              <div className="squad-bulk-banner">
                <div className="squad-bulk-info">
                  <Zap size={18} className="text-amber" />
                  <div>
                    <strong>Assign Squad {modalSquadFilter}</strong>
                    <p className="subtext">
                      {unassignedStudents.length} unassigned student(s) available in this squad.
                    </p>
                  </div>
                </div>
                <button
                  className="btn-primary btn-sm"
                  disabled={bulkAssigning || unassignedStudents.length === 0}
                  onClick={() =>
                    handleBulkAssignSquad(modalSquadFilter, unassignedStudents)
                  }
                >
                  {bulkAssigning ? (
                    <RefreshCw size={14} className="spin-icon" />
                  ) : (
                    <CheckSquare size={14} />
                  )}
                  Assign Entire Squad ({unassignedStudents.length})
                </button>
              </div>
            )}

            <div className="unassigned-list-container">
              {unassignedStudents.length === 0 ? (
                <div className="empty-message" style={{ padding: "2.5rem 1rem" }}>
                  <AlertCircle size={24} />
                  <p>No unassigned students match your current modal filter.</p>
                </div>
              ) : (
                unassignedStudents.map((student) => {
                  const sId = student.user_id || student.id;
                  return (
                    <div key={sId} className="unassigned-item">
                      <div className="unassigned-info">
                        {student.avatar_url ? (
                          <img
                            src={student.avatar_url}
                            alt={student.name}
                            className="student-avatar-img"
                          />
                        ) : (
                          <div className="student-avatar generic-avatar">
                            {student.name?.charAt(0) || "S"}
                          </div>
                        )}
                        <div>
                          <div className="student-name">{student.name}</div>
                          <div className="unassigned-meta">
                            <span className="email-text">{student.email}</span>
                            <span className="squad-badge">
                              Squad {student.squad_id}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn-primary btn-sm"
                        disabled={actionLoadingId === sId || bulkAssigning}
                        onClick={() =>
                          handleAssignStudent(sId, student.squad_id)
                        }
                      >
                        {actionLoadingId === sId ? (
                          <RefreshCw size={14} className="spin-icon" />
                        ) : (
                          <Plus size={14} />
                        )}
                        Assign
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {selectedStudentForStats && (
        <div className="modal-backdrop" onClick={handleCloseStatsModal}>
          <div className="modal-card modal-card-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                {selectedStudentForStats.avatar_url ? (
                  <img
                    src={selectedStudentForStats.avatar_url}
                    alt={selectedStudentForStats.name}
                    className="student-avatar-img"
                  />
                ) : (
                  <div className="student-avatar generic-avatar">
                    {selectedStudentForStats.name?.charAt(0) || "S"}
                  </div>
                )}
                <div>
                  <div className="modal-title-row">
                    <h3>{selectedStudentForStats.name}</h3>
                    <span className="squad-badge">
                      Squad {selectedStudentForStats.squad_id}
                    </span>
                  </div>
                  <p className="subtext">{selectedStudentForStats.email}</p>
                </div>
              </div>
              <button className="icon-btn" onClick={handleCloseStatsModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingStats ? (
                <div className="empty-message" style={{ padding: "3rem 0" }}>
                  <RefreshCw size={32} className="spin-icon" />
                  <p>Fetching developer stats for {selectedStudentForStats.name}...</p>
                </div>
              ) : statsError ? (
                <div className="status-badge inactive">{statsError}</div>
              ) : (
                <>
                  {/* GitHub Live Stats Section */}
                  <div className="modal-section">
                    <span className="section-title">GitHub Overview</span>
                    {!selectedStudentForStats.github &&
                    !selectedStudentForStats.github_url ? (
                      <p className="no-platforms-label">
                        No GitHub profile URL linked for this student.
                      </p>
                    ) : statsData.github?.error ? (
                      <p className="text-muted">{statsData.github.error}</p>
                    ) : (
                      <div className="contact-grid">
                        <div className="contact-item">
                          <GithubIcon size={18} />
                          <div>
                            <span className="contact-label">Public Repos</span>
                            <span className="contact-value">
                              {statsData.github?.repos ?? statsData.github?.public_repos ?? "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <GithubIcon size={18} />
                          <div>
                            <span className="contact-label">Followers</span>
                            <span className="contact-value">
                              {statsData.github?.followers ?? "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LeetCode Live Stats Section */}
                  <div className="modal-section">
                    <span className="section-title">LeetCode Overview</span>
                    {!selectedStudentForStats.leetcode &&
                    !selectedStudentForStats.leetcode_url ? (
                      <p className="no-platforms-label">
                        No LeetCode profile URL linked for this student.
                      </p>
                    ) : statsData.leetcode?.error ? (
                      <p className="text-muted">{statsData.leetcode.error}</p>
                    ) : (
                      <div className="contact-grid">
                        <div className="contact-item">
                          <Code2 size={18} />
                          <div>
                            <span className="contact-label">Total Solved</span>
                            <span className="contact-value">
                              {statsData.leetcode?.totalSolved ?? "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <Code2 size={18} />
                          <div>
                            <span className="contact-label">Easy / Med / Hard</span>
                            <span className="contact-value">
                              {statsData.leetcode?.easySolved ?? 0} /{" "}
                              {statsData.leetcode?.mediumSolved ?? 0} /{" "}
                              {statsData.leetcode?.hardSolved ?? 0}
                            </span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <Code2 size={18} />
                          <div>
                            <span className="contact-label">Global Ranking</span>
                            <span className="contact-value">
                              {statsData.leetcode?.ranking
                                ? `#${statsData.leetcode.ranking}`
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detailed Question Activity Log */}
                  <div className="modal-section">
                    <div className="section-header-flex">
                      <span className="section-title">RECENTLY SOLVED QUESTIONS</span>
                      {(selectedStudentForStats.last_solved_at || statsData.leetcode?.last_solved_at) && (
                        <span className="subtext">
                          Last Solved: {formatDateTime(selectedStudentForStats.last_solved_at || statsData.leetcode?.last_solved_at).fullStr}
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
                          {recentSubmissions.filter((item) => item?.title || item?.question || item?.titleSlug).length > 0 ? (
                            recentSubmissions
                              .filter((item) => item?.title || item?.question || item?.titleSlug)
                              .map((item, idx) => {
                                const title = item?.title || item?.question || "Solved Problem";
                                const difficulty = item?.difficulty || item?.level || item?.diff || "Medium";
                                const status = item?.statusDisplay || item?.status || "Accepted";
                                const { dateStr, timeStr } = formatDateTime(
                                  item?.timestamp || item?.solvedAt || item?.date || item?.last_solved_at
                                );

                                const difficultyClass = difficulty.toLowerCase().includes("easy")
                                  ? "easy"
                                  : difficulty.toLowerCase().includes("hard")
                                  ? "hard"
                                  : "medium";

                                return (
                                  <tr key={item.id || idx}>
                                    <td data-label="Question Title">
                                      <div className="question-title-cell">
                                        <FileCode2 size={14} className="text-muted" />
                                        {item.url ? (
                                          <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="question-link"
                                          >
                                            {title}
                                          </a>
                                        ) : (
                                          <span>{title}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td data-label="Difficulty">
                                      <span className={`difficulty-badge ${difficultyClass}`}>
                                        {difficulty}
                                      </span>
                                    </td>
                                    <td data-label="Status">
                                      <span className="status-badge active">
                                        <CheckCircle2 size={12} /> {status}
                                      </span>
                                    </td>
                                    <td data-label="Date Solved">
                                      <div className="time-info-cell">
                                        <Calendar size={13} className="text-muted" />
                                        <span>{dateStr}</span>
                                      </div>
                                    </td>
                                    <td data-label="Exact Time">
                                      <div className="time-info-cell">
                                        <Clock size={13} className="text-muted" />
                                        <span>{timeStr}</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ textAlign: "center", padding: "1rem" }}>
                                <div className="empty-message-box" style={{ margin: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
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

                  {/* Connected External Handles */}
                  <div className="modal-section">
                    <span className="section-title">CONNECTED HANDLES & PROFILES</span>
                    <div className="quick-links">
                      {(selectedStudentForStats.leetcode ||
                        selectedStudentForStats.leetcode_url) && (
                        <a
                          href={
                            (
                              selectedStudentForStats.leetcode ||
                              selectedStudentForStats.leetcode_url
                            ).startsWith("http")
                              ? selectedStudentForStats.leetcode ||
                                selectedStudentForStats.leetcode_url
                              : `https://leetcode.com/u/${selectedStudentForStats.leetcode}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="quick-link resume-link"
                        >
                          <Code2 size={16} /> Open LeetCode Profile
                        </a>
                      )}
                      {(selectedStudentForStats.github ||
                        selectedStudentForStats.github_url) && (
                        <a
                          href={
                            (
                              selectedStudentForStats.github ||
                              selectedStudentForStats.github_url
                            ).startsWith("http")
                              ? selectedStudentForStats.github ||
                                selectedStudentForStats.github_url
                              : `https://github.com/${selectedStudentForStats.github}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="quick-link resume-link"
                        >
                          <GithubIcon size={16} /> Open GitHub Profile
                        </a>
                      )}
                      {(selectedStudentForStats.codechef ||
                        selectedStudentForStats.codechef_url) && (
                        <a
                          href={
                            (
                              selectedStudentForStats.codechef ||
                              selectedStudentForStats.codechef_url
                            ).startsWith("http")
                              ? selectedStudentForStats.codechef ||
                                selectedStudentForStats.codechef_url
                              : `https://www.codechef.com/users/${selectedStudentForStats.codechef}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="quick-link resume-link"
                        >
                          <Code2 size={16} /> Open CodeChef Profile
                        </a>
                      )}
                      {(selectedStudentForStats.linkedin ||
                        selectedStudentForStats.linkedin_url) && (
                        <a
                          href={
                            (
                              selectedStudentForStats.linkedin ||
                              selectedStudentForStats.linkedin_url
                            ).startsWith("http")
                              ? selectedStudentForStats.linkedin ||
                                selectedStudentForStats.linkedin_url
                              : `https://linkedin.com/in/${selectedStudentForStats.linkedin}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="quick-link linkedin-link"
                        >
                          <LinkedinIcon size={16} /> Open LinkedIn Profile
                        </a>
                      )}
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