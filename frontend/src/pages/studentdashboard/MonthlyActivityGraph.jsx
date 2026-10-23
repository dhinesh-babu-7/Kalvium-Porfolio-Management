import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getMyMonthlyActivity } from "../../api/routes/StudentDashboard/monthly";
import "./monthlyactivity.css";

const currentMonthStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const shiftMonth = (monthStr, delta) => {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (monthStr) => {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const pointColor = (status) => {
  if (status === "completed") return "#16a34a";
  if (status === "exception") return "#f59e0b";
  if (status === "session") return "#2563eb";
  if (status === "missed") return "#cbd5e1";
  return "#e2e8f0";
};

const statusText = (day) => {
  if (day.status === "completed")
    return `${day.solved_count} solved`;
  if (day.status === "exception") return "Exception day";
  if (day.status === "session") return "Monitored session";
  if (day.status === "missed") return "No activity";
  return "Upcoming";
};

export default function MonthlyActivityGraph() {
  const [month, setMonth] = useState(() => currentMonthStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyMonthlyActivity(month)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const summary = data?.summary || {};
  const days = data?.days || [];
  const isCurrentMonth = month === currentMonthStr();

  const lineGeom = useMemo(() => {
    const W = 720;
    const H = 190;
    const PAD_L = 34;
    const PAD_R = 14;
    const PAD_T = 16;
    const PAD_B = 26;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    const plotDays = days.filter((d) => d.status !== "future");
    const peak = Math.max(1, ...days.map((d) => d.solved_count || 0));
    const yTicks =
      peak <= 3
        ? Array.from({ length: peak + 1 }, (_, i) => i)
        : [0, Math.ceil(peak / 2), peak];
    const x = (plotIdx) =>
      plotDays.length <= 1
        ? PAD_L
        : PAD_L + (plotIdx / (plotDays.length - 1)) * plotW;
    const y = (v) => PAD_T + plotH - (v / peak) * plotH;
    let path = "";
    plotDays.forEach((day) => {
      const i = plotDays.indexOf(day);
      const cmd = path ? "L" : "M";
      path += `${cmd}${x(i).toFixed(1)},${y(day.solved_count || 0).toFixed(1)} `;
    });
    const area =
      plotDays.length > 0
        ? `${path.trim()} L${x(
            plotDays.length - 1
          ).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${x(
            0
          ).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`
        : "";
    return {
      W,
      H,
      PAD_L,
      PAD_R,
      PAD_T,
      PAD_B,
      plotW,
      plotH,
      plotDays,
      peak,
      yTicks,
      x,
      y,
      path: path.trim(),
      area,
    };
  }, [days]);

  const pill = (label, value, color, textColor) => (
    <span
      className="ma-pill"
      style={{
        background: color,
        color: textColor,
        borderColor: "rgba(255,255,255,0.5)",
      }}
    >
      {value} {label}
    </span>
  );

  return (
    <div className="ma-section">
      <div className="ma-header">
        <div className="ma-nav">
          <button
            className="ma-nav-btn"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            disabled={isCurrentMonth}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="ma-month-title">
            {monthLabel(month)}{" "}
            {isCurrentMonth ? <span className="ma-current-tag">(current)</span> : null}
          </span>
          <button
            className="ma-nav-btn"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrentMonth}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="ma-summary">
          {pill("Completed", summary.completedDays ?? 0, "#16a34a", "#ffffff")}
          {pill("Session", summary.sessionDays ?? 0, "#2563eb", "#ffffff")}
          {pill("Missed", summary.missedDays ?? 0, "#cbd5e1", "#334155")}
          {pill("Exception", summary.exceptionDays ?? 0, "#f59e0b", "#ffffff")}
          {pill("Solved", summary.totalSolvedThisMonth ?? 0, "#0f172a", "#ffffff")}
        </div>
      </div>

      {loading ? (
        <div className="ma-loader"><Loader2 size={20} /></div>
      ) : !data ? (
        <div className="ma-empty">Unable to load monthly activity.</div>
      ) : days.length === 0 ? (
        <div className="ma-empty">
          No daily records yet — snapshots start the day after the migration +
          cron run.
        </div>
      ) : (
        <>
          <div className="ma-chart-line" role="img" aria-label={`Daily solves line for ${monthLabel(month)}`}>
            <svg width="100%" viewBox={`0 0 ${lineGeom.W} ${lineGeom.H}`} className="ma-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="maLineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {lineGeom.yTicks.map((t) => (
                <g key={t}>
                  <line
                    x1={lineGeom.PAD_L}
                    x2={lineGeom.W - lineGeom.PAD_R}
                    y1={lineGeom.y(t)}
                    y2={lineGeom.y(t)}
                    className="ma-grid"
                  />
                  <text
                    x={lineGeom.PAD_L - 8}
                    y={lineGeom.y(t) + 4}
                    textAnchor="end"
                    className="ma-tick"
                  >
                    {t}
                  </text>
                </g>
              ))}
              {lineGeom.area && <path d={lineGeom.area} fill="url(#maLineFill)" />}
              {lineGeom.path && (
                <path
                  d={lineGeom.path}
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {lineGeom.plotDays.map((day) => {
                const i = lineGeom.plotDays.indexOf(day);
                const cx = lineGeom.x(i);
                const cy = lineGeom.y(day.solved_count || 0);
                return (
                  <g key={day.date}>
                    <title>{`${day.date}: ${statusText(day)}`}</title>
                    {day.status === "exception" && (
                      <line
                        x1={cx}
                        x2={cx}
                        y1={lineGeom.PAD_T}
                        y2={lineGeom.PAD_T + lineGeom.plotH}
                        className="ma-exc-band"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={day.status === "completed" ? 4.5 : 3.5}
                      fill={pointColor(day.status)}
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    {day.status === "completed" && day.solved_count > 0 && (
                      <text
                        x={cx}
                        y={cy - 9}
                        textAnchor="middle"
                        className="ma-point-label"
                      >
                        {day.solved_count}
                      </text>
                    )}
                  </g>
                );
              })}
              {[1, Math.ceil(lineGeom.plotDays.length / 2), lineGeom.plotDays.length].map((dNum, idx) => {
                if (!lineGeom.plotDays[dNum - 1]) return null;
                return (
                  <text
                    key={idx}
                    x={lineGeom.x(dNum - 1)}
                    y={lineGeom.H - 8}
                    textAnchor="middle"
                    className="ma-tick"
                  >
                    {monthLabel(month).split(" ")[0].slice(0, 3)} {dNum}
                  </text>
                );
              })}
            </svg>
          </div>
          <div className="ma-legend">
            <span><i className="ma-line-sample" /> Solved / day</span>
            <span><i className="ma-dot ma-dot-green" /> Completed</span>
            <span><i className="ma-dot ma-dot-blue" /> Session</span>
            <span><i className="ma-dot ma-dot-grey" /> Missed</span>
            <span><i className="ma-dot ma-dot-amber" /> Exception</span>
          </div>
          {(summary.daysTracked ?? 0) === 0 && (
            <div className="ma-hint">
              Showing exception + calendar baseline — daily snapshots will fill in after the next cron run.
            </div>
          )}
        </>
      )}
    </div>
  );
}

