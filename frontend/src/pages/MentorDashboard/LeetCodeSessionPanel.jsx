import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Play, Square, Clock, CheckCircle2, UserX,
  AlertCircle, RefreshCw, Activity, Download, Users,
  FileText, ChevronDown, History
} from "lucide-react";
import {
  getLeetcodeSession,
  getLeetcodeSessionReports,
  startLeetcodeSession,
  endLeetcodeSession,
  updateLeetcodeSession
} from "../../api/routes/MentorDashboard/leetcodeSession";
import "./leetcodesession.css";

const formatClock = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// One student row inside the active session view. `completed` is decided by the
// backend, which diffs the live LeetCode snapshot against the session baseline.
function SessionStudentRow({ student, completed }) {
  const hasLeetcode = student.has_leetcode ?? Boolean(student.leetcode_username);
  const solvedDuringSession =
    student.solved_during_session ?? student.solved_today ?? 0;
  const newSubmissions = student.new_submissions || [];
  const lastActivity = formatClock(student.last_activity);

  return (
    <div
      className={`ls-student-card ${
        completed ? "ls-student-completed" : "ls-student-not-completed"
      }`}
    >
      <div className="ls-student-avatar">
        {student.avatar_url ? (
          <img src={student.avatar_url} alt={student.name} />
        ) : (
          <span className="ls-student-avatar-placeholder">
            {student.name?.charAt(0) || "?"}
          </span>
        )}
      </div>

      <div className="ls-student-info">
        <span className="ls-student-name">{student.name}</span>
        <span className="ls-student-email">
          {student.leetcode_username
            ? `@${student.leetcode_username}`
            : student.kalvium_email || student.email || "No LeetCode handle"}
        </span>
        {newSubmissions.length > 0 && (
          <span className="ls-student-solved-titles">
            {newSubmissions
              .slice(0, 3)
              .map((sub) => sub.title)
              .join(", ")}
            {newSubmissions.length > 3
              ? ` +${newSubmissions.length - 3} more`
              : ""}
          </span>
        )}
      </div>

      <div className="ls-student-status">
        {!hasLeetcode ? (
          <div className="ls-student-no-leetcode">
            <AlertCircle size={16} className="ls-status-icon warning" />
            <span>LeetCode not configured</span>
          </div>
        ) : student.fetch_failed ? (
          <div className="ls-student-no-leetcode">
            <AlertCircle size={16} className="ls-status-icon warning" />
            <span>Could not reach LeetCode</span>
          </div>
        ) : completed ? (
          <div className="ls-student-completed-info">
            <span className="ls-status-line">
              <CheckCircle2 size={16} className="ls-status-icon completed" />
              {solvedDuringSession > 0
                ? `${solvedDuringSession} solved this session`
                : "Completed"}
            </span>
            {lastActivity && (
              <span className="ls-student-last-activity">
                <Clock size={12} /> {lastActivity}
              </span>
            )}
          </div>
        ) : (
          <div className="ls-student-not-completed-info">
            <span className="ls-status-line">
              <UserX size={16} className="ls-status-icon not-completed" />
              No problems solved yet
            </span>
            <span className="ls-student-last-activity">
              <Clock size={12} />
              {lastActivity ? `Last active ${lastActivity}` : "No recent activity"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const REVIEW_SCOPES = [
  { value: "last5", label: "Last 5 reports" },
  { value: "last3days", label: "Last 3 days" },
];

// A stored review report keeps trimmed student rows; map them back to the live
// session row shape so SessionStudentRow + the Excel export can be reused.
const reviewReportToSessionPayload = (report) => {
  if (!report) return null;
  const students = Array.isArray(report.students) ? report.students : [];
  const summary = report.summary || {};
  return {
    session: {
      id: report.id,
      started_at: report.started_at,
      ended_at: report.ended_at,
      squad_ids: report.squad_ids || [],
    },
    students: students.map((student) => ({
      user_id: student.user_id,
      name: student.name,
      avatar_url: student.avatar_url,
      kalvium_email: student.kalvium_email,
      squad_id: student.squad_id,
      leetcode_username: student.leetcode_username,
      has_leetcode: student.has_leetcode,
      fetch_failed: student.fetch_failed,
      completed_during_session: student.completed_during_session,
      solved_during_session: student.solved_during_session,
      new_submissions_count: student.new_submissions_count,
      new_submissions: student.new_submissions || [],
      live_total_solved: student.live_total_solved,
      last_activity: student.last_activity,
    })),
    summary: {
      total: summary.total ?? students.length,
      completed: summary.completed ?? 0,
      not_completed: summary.not_completed ?? 0,
      completionRate: summary.completionRate ?? 0,
      completedToday: summary.completed ?? 0,
      notCompletedToday: summary.not_completed ?? 0,
    },
  };
};

const formatReportDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return "-";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};
// Past ended sessions for the current mentor, expandable with per-student
// detail + Excel export. Supports "Last 5 reports" and "Last 3 days".
function ReviewReportSection({ buildReport, downloadReport, isExporting }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState("last5");
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchReports = async (nextScope) => {
    setIsLoading(true);
    setReportError(null);
    try {
      const data = await getLeetcodeSessionReports(nextScope);
      if (data?.error) {
        setReportError(data.error);
        setReports([]);
      } else {
        setReports(Array.isArray(data?.reports) ? data.reports : []);
      }
    } catch (err) {
      console.error("Error fetching session reports:", err);
      setReportError("Failed to load session reports");
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && reports.length === 0 && !isLoading) {
      fetchReports(scope);
    }
  };

  const handleScopeChange = (event) => {
    const nextScope = event.target.value;
    setScope(nextScope);
    setExpandedId(null);
    fetchReports(nextScope);
  };

  const handleDownload = (report) => {
    const payload = reviewReportToSessionPayload(report);
    if (!payload) return;
    downloadReport(buildReport(payload));
  };

  return (
    <div className="ls-review">
      <button
        type="button"
        className="ls-btn ls-btn-review"
        onClick={toggleOpen}
        aria-expanded={isOpen}
      >
        <FileText size={18} />
        Review Report
        <ChevronDown
          size={16}
          className={`ls-review-chevron ${isOpen ? "ls-review-chevron-open" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="ls-review-panel">
          <div className="ls-review-toolbar">
            <span className="ls-review-title">
              <History size={14} />
              Past sessions
            </span>
            <select
              className="ls-review-scope"
              value={scope}
              onChange={handleScopeChange}
              disabled={isLoading}
              aria-label="Review report range"
            >
              {REVIEW_SCOPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {reportError && (
            <div className="ls-review-error">
              <AlertCircle size={14} />
              <span>{reportError}</span>
            </div>
          )}

          {isLoading && (
            <p className="ls-review-empty">Loading session reports…</p>
          )}
          {!isLoading && reports.length === 0 && !reportError && (
            <p className="ls-review-empty">
              No ended sessions found
              {scope === "last3days" ? " in the last 3 days" : " yet"}. Sessions
              you end will appear here.
            </p>
          )}

          {!isLoading && reports.length > 0 && (
            <ReviewReportList
              reports={reports}
              expandedId={expandedId}
              isExporting={isExporting}
              onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
              onDownload={handleDownload}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReviewReportList({ reports, expandedId, isExporting, onToggle, onDownload }) {
  return (
    <ul className="ls-review-list">
      {reports.map((report) => {
        const expanded = expandedId === report.id;
        const summary = report.summary || {};
        const total = summary.total ?? report.students?.length ?? 0;
        const completed = summary.completed ?? 0;
        const rate = summary.completionRate ?? 0;

        return (
          <li key={report.id} className="ls-review-item">
            <button
              type="button"
              className="ls-review-item-head"
              onClick={() => onToggle(report.id)}
              aria-expanded={expanded}
            >
              <span className="ls-review-item-main">
                <span className="ls-review-item-title">
                  Session #{report.id}
                  {!report.has_detailed_report && (
                    <span className="ls-review-legacy-tag">
                      session info only
                    </span>
                  )}
                </span>
                <span className="ls-review-item-sub">
                  {formatReportDateTime(report.started_at)}
                  {" → "}
                  {formatReportDateTime(report.ended_at)}
                  {" · "}
                  {formatDuration(report.duration_minutes)}
                  {" · Squads: "}
                  {(report.squad_ids || []).join(", ") || "-"}
                </span>
              </span>
              <span className="ls-review-item-stats">
                {report.has_detailed_report
                  ? `${completed}/${total} completed (${rate}%)`
                  : "session info only"}
              </span>
              <ChevronDown
                size={16}
                className={`ls-review-chevron ${expanded ? "ls-review-chevron-open" : ""}`}
              />
            </button>

            {expanded && (
              <ReviewReportDetail
                report={report}
                isExporting={isExporting}
                onDownload={onDownload}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ReviewReportDetail({ report, isExporting, onDownload }) {
  if (!report.has_detailed_report) {
    return (
      <div className="ls-review-item-body">
        <p className="ls-review-empty">
          This session ended before detailed reports were saved, so only timing
          and squad info is available.
        </p>
      </div>
    );
  }

  const summary = report.summary || {};
  return (
    <div className="ls-review-item-body">
      <div className="ls-review-summary">
        <span>Total: {summary.total ?? 0}</span>
        <span>Completed: {summary.completed ?? 0}</span>
        <span>Not completed: {summary.not_completed ?? 0}</span>
        <span>Completion: {summary.completionRate ?? 0}%</span>
      </div>
      <div className="ls-review-students">
        {(report.students || []).map((student) => (
          <SessionStudentRow
            key={student.user_id || student.name}
            student={{ ...student, new_submissions: student.new_submissions || [] }}
            completed={Boolean(student.completed_during_session)}
          />
        ))}
      </div>
      <button
        type="button"
        className="ls-btn ls-btn-download ls-review-download"
        onClick={() => onDownload(report)}
        disabled={isExporting}
      >
        <Download size={16} />
        {isExporting ? "Preparing..." : "Download this report (.xlsx)"}
      </button>
    </div>
  );
}

// Splits the roster into completed / not completed for the active view.

function StudentActivityGroups({ students, summary }) {
  const completed =
    Array.isArray(summary?.completedStudents) && summary.completedStudents.length > 0
      ? summary.completedStudents
      : students.filter((student) => student.completed_during_session);

  const notCompleted =
    Array.isArray(summary?.notCompletedStudents) &&
    summary.notCompletedStudents.length > 0
      ? summary.notCompletedStudents
      : students.filter((student) => !student.completed_during_session);

  return (
    <div className="ls-student-list">
      <div className="ls-student-list-header">
        <h4>Student Activity Status</h4>
        <span className="ls-student-count">{students.length} students</span>
      </div>

      <div className="ls-session-groups">
        <div className="ls-group">
          <div className="ls-group-header ls-group-header-completed">
            <CheckCircle2 size={16} />
            <span>Completed ({completed.length})</span>
          </div>
          {completed.length > 0 ? (
            <div className="ls-student-grid">
              {completed.map((student) => (
                <SessionStudentRow
                  key={student.user_id}
                  student={student}
                  completed
                />
              ))}
            </div>
          ) : (
            <p className="ls-group-empty">
              No student has solved a problem yet.
            </p>
          )}
        </div>

        <div className="ls-group">
          <div className="ls-group-header ls-group-header-not-completed">
            <UserX size={16} />
            <span>Not Completed ({notCompleted.length})</span>
          </div>
          {notCompleted.length > 0 ? (
            <div className="ls-student-grid">
              {notCompleted.map((student) => (
                <SessionStudentRow
                  key={student.user_id}
                  student={student}
                  completed={false}
                />
              ))}
            </div>
          ) : (
            <p className="ls-group-empty">
              Everyone has solved at least one problem.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// SVG timeline of completed vs not-completed students across the session.
// Built with plain SVG (no charting library) to match the existing CSS-only
// donut chart approach.
function ActivityTimelineChart({ activityData, totalCount }) {
  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const points = Array.isArray(activityData) ? activityData : [];

  if (points.length < 2) {
    return (
      <div className="ls-activity-chart-empty">
        <Activity size={28} />
        <p>
          Collecting activity data… the chart appears after the first auto-refresh
          (every 30s) or when you press Refresh.
        </p>
      </div>
    );
  }

  const maxValue = Math.max(
    totalCount || 0,
    ...points.map((p) => Number(p.completed) || 0),
    ...points.map((p) => Number(p.notCompleted) || 0),
    1
  );
  // Round the y-axis up to a friendly step so the scale reads cleanly
  const step = maxValue <= 5 ? 1 : Math.ceil(maxValue / 5);
  const yMax = Math.ceil(maxValue / step) * step;

  const toX = (index) =>
    padding.left + (index / (points.length - 1)) * plotWidth;
  const toY = (value) =>
    padding.top + plotHeight - ((value / yMax) || 0) * plotHeight;

  const buildPath = (key) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(Number(p[key]) || 0).toFixed(1)}`
      )
      .join(" ");

  const buildArea = (key) =>
    `${buildPath(key)} L ${toX(points.length - 1).toFixed(1)} ${padding.top + plotHeight} L ${toX(0).toFixed(1)} ${padding.top + plotHeight} Z`;

  const gridLines = [];
  for (let value = 0; value <= yMax; value += step) {
    gridLines.push({ value, y: toY(value) });
  }

  const formatTick = (point) =>
    point.time instanceof Date
      ? point.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

  const firstTime = formatTick(points[0]);
  const midTime = formatTick(points[Math.floor((points.length - 1) / 2)]);
  const lastTime = formatTick(points[points.length - 1]);
  const latest = points[points.length - 1];

  return (
    <div className="ls-activity-chart">
      <svg
        className="ls-activity-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Completed vs not completed students over time"
      >
        {/* Horizontal grid lines + y-axis labels */}
        {gridLines.map(({ value, y }) => (
          <g key={value}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              className="ls-chart-grid-line"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="ls-chart-axis-text"
            >
              {value}
            </text>
          </g>
        ))}

        {/* Completed area + line */}
        <path d={buildArea("completed")} className="ls-chart-area-completed" />
        <path d={buildPath("completed")} className="ls-chart-line-completed" />

        {/* Not completed line */}
        <path d={buildPath("notCompleted")} className="ls-chart-line-not-completed" />

        {/* Data points (with hover tooltips) */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={toX(i)}
              cy={toY(Number(p.completed) || 0)}
              r="3.5"
              className="ls-chart-dot-completed"
            >
              <title>{`${formatTick(p)} — ${Number(p.completed) || 0} completed`}</title>
            </circle>
            <circle
              cx={toX(i)}
              cy={toY(Number(p.notCompleted) || 0)}
              r="3.5"
              className="ls-chart-dot-not-completed"
            >
              <title>{`${formatTick(p)} — ${Number(p.notCompleted) || 0} not completed`}</title>
            </circle>
          </g>
        ))}

        {/* X-axis time labels */}
        <text
          x={padding.left}
          y={height - 8}
          textAnchor="start"
          className="ls-chart-axis-text"
        >
          {firstTime}
        </text>
        {points.length > 2 && (
          <text
            x={padding.left + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            className="ls-chart-axis-text"
          >
            {midTime}
          </text>
        )}
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          className="ls-chart-axis-text"
        >
          {lastTime}
        </text>
      </svg>

      <div className="ls-activity-chart-footer">
        <div className="ls-legend-row">
          <span className="ls-legend-dot ls-legend-dot-completed" />
          <span className="ls-legend-label">Completed</span>
          <span className="ls-legend-value">{latest.completed ?? 0}</span>
        </div>
        <div className="ls-legend-row">
          <span className="ls-legend-dot ls-legend-dot-pending" />
          <span className="ls-legend-label">Not completed</span>
          <span className="ls-legend-value">{latest.notCompleted ?? 0}</span>
        </div>
        <span className="ls-activity-chart-samples">
          {points.length} snapshot{points.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

export default function LeetCodeSessionPanel({ squads, assignedStudents, onStudentUpdate }) {
  const [session, setSession] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // History of session snapshots (completed vs not completed over time) that
  // feeds the "Activity Over Time" timeline chart
  const [activityData, setActivityData] = useState([]);

  // Snapshot of the session summary kept after the session ends, so the
  // mentor can still download the Excel report once the live view is gone
  const [lastReport, setLastReport] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Flattens the live session payload into plain rows Excel can consume
  const buildSessionReport = (sessionData) => {
    const liveSession = sessionData?.session || {};
    const students = Array.isArray(sessionData?.students)
      ? sessionData.students
      : [];
    const summary = sessionData?.summary || {};

    return {
      generatedAt: new Date(),
      startedAt: liveSession.started_at || null,
      endedAt:
        liveSession.ended_at || sessionData?.lastUpdated || new Date().toISOString(),
      total: summary.total ?? students.length,
      completed: summary.completed ?? summary.completedToday ?? 0,
      notCompleted: summary.not_completed ?? summary.notCompletedToday ?? 0,
      completionRate: summary.completionRate ?? 0,
      rows: students.map((student) => {
        const status = !student.has_leetcode
          ? "No LeetCode handle"
          : student.fetch_failed
            ? "LeetCode unreachable"
            : student.completed_during_session
              ? "Completed"
              : "Not completed";
        const solvedTitles = Array.isArray(student.new_submissions)
          ? student.new_submissions.map((sub) => sub.title).filter(Boolean)
          : [];

        return {
          Name: student.name || "Unnamed Student",
          "LeetCode Username": student.leetcode_username || "-",
          Squad: student.squad_id ?? "-",
          Status: status,
          "Solved During Session": student.solved_during_session ?? 0,
          "New Submissions": student.new_submissions_count ?? 0,
          "Solved Titles": solvedTitles.join("; "),
          "Total Solved": student.live_total_solved ?? student.total_solved ?? 0,
          "Last Activity": student.last_activity
            ? new Date(student.last_activity).toLocaleString()
            : "-",
        };
      }),
    };
  };

  // Writes the snapshot to a real .xlsx file entirely in the browser
  const downloadSessionReport = (report) => {
    if (!report || !Array.isArray(report.rows) || report.rows.length === 0) {
      setError("Nothing to export - no student data in this session");
      return;
    }

    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: every student and what they did during the session
      const detailSheet = XLSX.utils.json_to_sheet(report.rows);
      detailSheet["!cols"] = [
        { wch: 24 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
        { wch: 22 }, { wch: 16 }, { wch: 60 }, { wch: 14 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(workbook, detailSheet, "Session Details");

      // Sheet 2: headline numbers for the session
      const summaryRows = [
        ["LeetCode Session Report"],
        ["Generated At", report.generatedAt.toLocaleString()],
        ["Session Started", report.startedAt ? new Date(report.startedAt).toLocaleString() : "-"],
        ["Session Ended", report.endedAt ? new Date(report.endedAt).toLocaleString() : "-"],
        ["Total Students", report.total],
        ["Completed", report.completed],
        ["Not Completed", report.notCompleted],
        ["Completion Rate (%)", report.completionRate],
      ];
      const sessionSummarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      sessionSummarySheet["!cols"] = [{ wch: 20 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(workbook, sessionSummarySheet, "Summary");

      const stamp = report.generatedAt.toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(workbook, `leetcode-session-report-${stamp}.xlsx`);
    } catch (err) {
      console.error("Error exporting session report:", err);
      setError("Failed to export the session report");
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch current session status
  useEffect(() => {
    let isMounted = true;

    async function fetchSession() {
      try {
        const sessionData = await getLeetcodeSession();
        if (isMounted) {
          setSession(sessionData);
          if (sessionData.active && sessionData.session) {
            setLastUpdated(new Date());
            // Seed the timeline chart with the current snapshot so mentors who
            // reopen the tab mid-session still see a starting data point
            setActivityData([
              {
                time: new Date(),
                completed:
                  sessionData.summary?.completedToday ??
                  sessionData.summary?.completed ??
                  0,
                notCompleted:
                  sessionData.summary?.notCompletedToday ??
                  sessionData.summary?.not_completed ??
                  0,
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      }
    }

    fetchSession();
    return () => { isMounted = false; };
  }, []);

  // Stop polling when the panel unmounts so no interval leaks
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Start session
  const handleStartSession = async () => {
    if (!squads || squads.length === 0) {
      setError("No squads available to monitor");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      // Squads can arrive either as plain squad ids (Assigned tab) or as
      // objects, so accept both shapes.
      const squadIds = squads
        .map((s) => (s && typeof s === "object" ? s.squad_id ?? s.id : s))
        .filter((id) => id !== null && id !== undefined && id !== "");

      if (squadIds.length === 0) {
        setError("No valid squads available to monitor");
        setIsStarting(false);
        return;
      }

      const result = await startLeetcodeSession(squadIds);

      if (result && result.success) {
        // The start route returns the full live payload (session + students +
        // summary), so use it directly instead of the stale prop list.
        setSession({
          active: true,
          session: result.session,
          students: result.students || assignedStudents || [],
          summary: result.summary || null,
          lastUpdated: result.lastUpdated || new Date().toISOString(),
        });
        setLastUpdated(new Date());

        // Never leave an earlier poller running
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }

        // Start polling every 30 seconds (matches the backend rate limit)
        const interval = setInterval(async () => {
          const update = await updateLeetcodeSession();

          if (update && update.active) {
            setSession(update);
            setLastUpdated(new Date());
            setError(null);

            // Add activity data point
            setActivityData(prev => [
              ...prev.slice(-20), // Keep last 20 data points
              {
                time: new Date(),
                completed: update.summary?.completedToday || 0,
                notCompleted: update.summary?.notCompletedToday || 0
              }
            ]);

            if (onStudentUpdate) {
              onStudentUpdate(update);
            }
          } else if (update?.message) {
            // e.g. the 30 second rate limit kicked in
            setError(update.message);
          } else {
            // The session ended server-side (no message = not a rate limit),
            // so stop the poller and drop the live view
            clearInterval(interval);
            setPollingInterval(null);
            setSession({ active: false, session: null, students: [] });
          }
        }, 30000);
        setPollingInterval(interval);

        // Seed the graph with the snapshot captured when the session started
        setActivityData([
          {
            time: new Date(),
            completed: result.summary?.completedToday || 0,
            notCompleted: result.summary?.notCompletedToday || 0
          }
        ]);
      } else {
        setError(result?.error || "Failed to start session");
      }
    } catch (err) {
      console.error("Error starting session:", err);
      setError("Failed to start session");
    } finally {
      setIsStarting(false);
    }
  };

  // End session - snapshot the final live data first so the Excel report
  // survives after the live view is cleared
  const handleEndSession = async () => {
    if (session?.active) {
      setLastReport(buildSessionReport(session));
    }
    setIsStarting(true);

    try {
      const result = await endLeetcodeSession();
      if (result && result.success) {
        // Fall back to the pre-end snapshot if session state was empty
        setLastReport((prev) => prev || buildSessionReport(session));
        setSession({ active: false, session: null, students: [] });
        setActivityData([]);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      } else {
        setError(result?.error || "Failed to end session");
      }
    } catch (err) {
      console.error("Error ending session:", err);
      setError("Failed to end session");
    } finally {
      setIsStarting(false);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      const update = await updateLeetcodeSession();
      if (update && update.active) {
        setSession(update);
        setLastUpdated(new Date());

        // Keep the activity timeline chart in sync with manual refreshes too
        setActivityData((prev) => [
          ...prev.slice(-20), // Keep last 20 data points
          {
            time: new Date(),
            completed: update.summary?.completedToday ?? update.summary?.completed ?? 0,
            notCompleted:
              update.summary?.notCompletedToday ?? update.summary?.not_completed ?? 0,
          },
        ]);
      }
    } catch (err) {
      console.error("Error refreshing:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!session) {
    return null;
  }

  const isActive = session.active;
  const hasStudents = session.students && session.students.length > 0;
  const summary = session.summary;
  const completedCount = summary?.completed ?? summary?.completedToday ?? 0;
  const notCompletedCount = summary?.not_completed ?? summary?.notCompletedToday ?? 0;
  const totalCount = summary?.total ?? session.students?.length ?? 0;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="leetcode-session-panel">
      {/* Header */}
      <div className="ls-header">
        <div className="ls-header-title">
          <Activity size={20} className="ls-icon" />
          <h3>LeetCode Activity Monitor</h3>
        </div>
        
        {isActive && (
          <div className="ls-status-badge ls-status-active">
            <span className="ls-status-dot"></span>
            Active Session
          </div>
        )}
      </div>

      {/* Session Controls */}
      <div className="ls-controls">
        {!isActive ? (
          <div className="ls-controls-active">
            <button
              className="ls-btn ls-btn-start"
              onClick={handleStartSession}
              disabled={isStarting || !squads || squads.length === 0}
            >
              <Play size={18} />
              {isStarting ? "Starting..." : "Start Session"}
            </button>
            <ReviewReportSection
              buildReport={buildSessionReport}
              downloadReport={downloadSessionReport}
              isExporting={isExporting}
            />
          </div>
        ) : (
          <div className="ls-controls-active">
            <button
              className="ls-btn ls-btn-end"
              onClick={handleEndSession}
              disabled={isStarting}
            >
              <Square size={18} />
              {isStarting ? "Ending..." : "End Session"}
            </button>
            <button
              className="ls-btn ls-btn-refresh"
              onClick={handleRefresh}
              disabled={isUpdating}
            >
              <RefreshCw size={18} className={isUpdating ? "spin" : ""} />
              {isUpdating ? "Updating..." : "Refresh"}
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="ls-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Session Content */}
      {isActive && (
        <div className="ls-content">
          {/* Summary Cards */}
          {summary && (
            <div className="ls-summary-cards">
              <div className="ls-summary-card ls-summary-total">
                <span className="ls-summary-icon">
                  <Users size={18} />
                </span>
                <span className="ls-summary-text">
                  <span className="ls-summary-value">{summary.total}</span>
                  <span className="ls-summary-label">Total Students</span>
                </span>
              </div>
              <div className="ls-summary-card ls-summary-completed">
                <span className="ls-summary-icon">
                  <CheckCircle2 size={18} />
                </span>
                <span className="ls-summary-text">
                  <span className="ls-summary-value">{summary.completedToday}</span>
                  <span className="ls-summary-label">Completed Today</span>
                </span>
              </div>
              <div className="ls-summary-card ls-summary-not-completed">
                <span className="ls-summary-icon">
                  <UserX size={18} />
                </span>
                <span className="ls-summary-text">
                  <span className="ls-summary-value">{summary.notCompletedToday}</span>
                  <span className="ls-summary-label">Not Completed</span>
                </span>
              </div>
            </div>
          )}

          {/* Completion Pie Chart */}
          {summary && (
            <div className="ls-chart-card">
              <div className="ls-chart-head">
                <h4>Session Progress</h4>
                <span className="ls-graph-time">
                  <Clock size={14} />
                  Last update: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Never"}
                </span>
              </div>
              <div className="ls-chart-main">
                <div
                  className="ls-donut"
                  role="img"
                  aria-label={`Completion ${completionRate}%`}
                  style={{ "--ls-donut-pct": `${completionRate}%` }}
                >
                  <div className="ls-donut-center">
                    <span className="ls-donut-pct">{completionRate}%</span>
                    <span className="ls-donut-sub">completed</span>
                  </div>
                </div>
                <div className="ls-chart-legend">
                  <div className="ls-legend-row">
                    <span className="ls-legend-dot ls-legend-dot-completed" />
                    <span className="ls-legend-label">Completed</span>
                    <span className="ls-legend-value">{completedCount}</span>
                  </div>
                  <div className="ls-legend-row">
                    <span className="ls-legend-dot ls-legend-dot-pending" />
                    <span className="ls-legend-label">Not completed</span>
                    <span className="ls-legend-value">{notCompletedCount}</span>
                  </div>
                  <div className="ls-legend-row ls-legend-row-total">
                    <span className="ls-legend-dot ls-legend-dot-total" />
                    <span className="ls-legend-label">Total</span>
                    <span className="ls-legend-value">{totalCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Over Time timeline chart */}
          <div className="ls-chart-card ls-activity-chart-card">
            <div className="ls-chart-head">
              <h4>Activity Over Time</h4>
              <span className="ls-graph-time">
                <Clock size={14} />
                Snapshot every 30s (or on Refresh)
              </span>
            </div>
            <ActivityTimelineChart activityData={activityData} totalCount={totalCount} />
          </div>

          {/* Student Activity List - grouped by completed / not completed */}
          {hasStudents && (
            <StudentActivityGroups
              students={session.students}
              summary={summary}
            />
          )}

          {!hasStudents && (
            <div className="ls-no-students">
              <UserX size={32} />
              <p>No students assigned to the selected squads</p>
            </div>
          )}
        </div>
      )}

      {/* Inactive State */}
      {!isActive && (
        <div className="ls-inactive">
          <div className="ls-inactive-content">
            <Play size={48} />
            <h3>Session Not Active</h3>
            <p>Click &quot;Start Session&quot; to begin monitoring LeetCode activity for your assigned students in real-time.</p>
            {lastReport && lastReport.rows.length > 0 && (
              <div className="ls-report-download">
                <p className="ls-report-meta">
                  Last session: {lastReport.total} students, {lastReport.completed} completed
                  ({lastReport.completionRate}%).
                </p>
                <button
                  className="ls-btn ls-btn-download"
                  onClick={() => downloadSessionReport(lastReport)}
                  disabled={isExporting}
                >
                  <Download size={18} />
                  {isExporting ? "Preparing..." : "Download Session Report (.xlsx)"}
                </button>
              </div>
            )}
            <ReviewReportSection
              buildReport={buildSessionReport}
              downloadReport={downloadSessionReport}
              isExporting={isExporting}
            />
            <ul className="ls-features">
              <li>Track which students complete LeetCode problems during the session</li>
              <li>Live donut chart showing completed vs not completed</li>
              <li>Updates every 30 seconds while session is active</li>
              <li>View last activity time for each student</li>
              <li>Download the finished session as an Excel report</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
