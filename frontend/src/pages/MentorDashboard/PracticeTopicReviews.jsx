import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  decidePracticeTopicReview,
  getPracticeTopicReviews,
  importStudentBeltLevels,
} from "../../api/routes/MentorDashboard/practiceTopicReviews.js";
import * as XLSX from "xlsx";
import { getTopicProblemIds } from "../../lib/practiceProgress.js";
import Belt1 from "../studentdashboard/belts/Belt1.jsx";
import Belt2 from "../studentdashboard/belts/Belt2.jsx";
import Belt3 from "../studentdashboard/belts/Belt3.jsx";
import Belt4 from "../studentdashboard/belts/Belt4.jsx";
import Belt5 from "../studentdashboard/belts/Belt5.jsx";
import Belt6 from "../studentdashboard/belts/Belt6.jsx";
import Belt7 from "../studentdashboard/belts/Belt7.jsx";
import "./PracticeTopicReviews.css";

const BELTS = [Belt1, Belt2, Belt3, Belt4, Belt5, Belt6, Belt7];
const PRACTICE_SUBMISSIONS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1rC_U6xnnjDXyv9msCxg0ryF7V_FUF98m7i3CtIl7QoE/edit?gid=1204924227#gid=1204924227";
const TOPICS = new Map(
  BELTS.flatMap((belt) =>
    belt.topics.map((topic) => [
      topic.id,
      { ...topic, beltTitle: belt.title },
    ])
  )
);

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : "Time unavailable";
}

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Could not load topic reviews.";
}

function readBeltLevelRows(file) {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  });
}

function ReviewCard({ request, note, onNoteChange, onDecision, acting }) {
  const topic = TOPICS.get(request.topic_id);
  const problemIds = topic ? getTopicProblemIds(topic) : [];
  const solvedProblems = request.problem_progress?.[request.topic_id] || {};
  const pending = request.status === "pending";

  return (
    <article className={`topic-review-card ${pending ? "" : "is-reviewed"}`}>
      <header className="topic-review-card-header">
        <div className="topic-review-student">
          {request.student_avatar ? (
            <img src={request.student_avatar} alt="" />
          ) : (
            <span className="topic-review-avatar-fallback" aria-hidden="true">
              <UserRound size={20} />
            </span>
          )}
          <div>
            <strong>{request.student_name || "Student"}</strong>
            <span>{request.student_email || `Squad ${request.squad_id || "N/A"}`}</span>
          </div>
        </div>
        <span className={`topic-review-status ${request.status}`}>
          {pending ? <Clock size={14} /> : request.status === "approved" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {request.status}
        </span>
      </header>

      <div className="topic-review-content">
        <div className="topic-review-topic">
          <span>{request.belt_id ? `Belt ${request.belt_id}` : "Practice belt"} · {topic?.beltTitle || "Student Dojo"}</span>
          <h2>{topic?.title || request.topic_id}</h2>
          <p>Submitted {formatTime(request.created_at)}</p>
          <a className="topic-review-inline-sheet" href={PRACTICE_SUBMISSIONS_SHEET_URL} target="_blank" rel="noopener noreferrer">
            Open response sheet <ExternalLink size={13} />
          </a>
        </div>

        <div className="topic-review-problems">
          <strong>Practice problems</strong>
          {topic?.problems.length ? (
            <ul>
              {topic.problems.map((problem, index) => {
                const solved = solvedProblems[problemIds[index]] === true;
                const resource = topic.resources.find((item) =>
                  item.title.startsWith("Practice") &&
                  item.url.includes(`/problems/${problemIds[index]}/`)
                );
                return (
                  <li key={`${request.id}-${problem}`}>
                    {solved ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    <span>{problem}</span>
                    {resource && (
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${problem}`}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Topic details are unavailable for this request.</p>
          )}
        </div>
      </div>

      {pending ? (
        <div className="topic-review-actions">
          <label>
            <span>Note to student (optional)</span>
            <textarea
              value={note}
              maxLength={1000}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Share feedback or what needs more work..."
            />
          </label>
          <div>
            <button type="button" className="topic-review-button approve" disabled={acting} onClick={() => onDecision("approved")}>
              <CheckCircle size={16} /> {acting ? "Saving..." : "Approve & unlock next topic"}
            </button>
            <button type="button" className="topic-review-button reject" disabled={acting} onClick={() => onDecision("rejected")}>
              <XCircle size={16} /> Reject
            </button>
          </div>
        </div>
      ) : (
        <footer className="topic-review-note">
          <span>{request.status === "approved" ? "Approved" : "Rejected"} {request.reviewed_at ? formatTime(request.reviewed_at) : ""}</span>
          {request.mentor_note && <p>Mentor note: {request.mentor_note}</p>}
        </footer>
      )}
    </article>
  );
}

export default function PracticeTopicReviews() {
  const [requests, setRequests] = useState([]);
  const [assignedStudentCount, setAssignedStudentCount] = useState(0);
  const [notes, setNotes] = useState({});
  const [actingId, setActingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showReviewed, setShowReviewed] = useState(false);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    try {
      const data = await getPracticeTopicReviews();
      setRequests(data.requests);
      setAssignedStudentCount(data.assignedStudentCount);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => refresh(), 0);
    const intervalId = window.setInterval(() => refresh(), 30000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  useEffect(() => {
    if (!showReviewed) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowReviewed(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showReviewed]);

  const pending = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );
  const history = useMemo(
    () => requests.filter((request) => request.status !== "pending"),
    [requests]
  );

  const decide = async (request, decision) => {
    setActingId(request.id);
    setError("");
    try {
      const updated = await decidePracticeTopicReview(
        request.id,
        decision,
        notes[request.id] || ""
      );
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, ...updated, status: decision, mentor_note: notes[request.id] || "", reviewed_at: updated?.reviewed_at || new Date().toISOString() }
            : item
        )
      );
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="topic-reviews-page">
      <header className="topic-reviews-header">
        <div>
          <p className="topic-reviews-eyebrow">STUDENT DOJO</p>
          <h1>Topic Reviews</h1>
          <p>Verify a student's completed practice topic. Approving unlocks their next topic.</p>
        </div>
        <div className="topic-reviews-header-actions">
          <span className="topic-reviews-count"><Clock size={16} /> {pending.length} Pending</span>
          <button
            type="button"
            className="topic-reviews-history"
            onClick={() => setShowReviewed(true)}
          >
            <BadgeCheck size={16} /> Reviewed ({history.length})
          </button>
          <button type="button" className="topic-reviews-refresh" onClick={() => refresh(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "is-spinning" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="topic-reviews-error" role="alert"><AlertCircle size={18} />{error}</div>}

      <section className="topic-review-sheet">
        <header>
          <div>
            <h2>Student video submissions</h2>
            <p>Open the submission sheet to review student videos before deciding.</p>
          </div>
          <a href={PRACTICE_SUBMISSIONS_SHEET_URL} target="_blank" rel="noopener noreferrer">
            Open submission sheet <ExternalLink size={15} />
          </a>
        </header>
      </section>

      <BeltLevelsImport onError={setError} />

      {loading ? (
        <div className="topic-reviews-state">Loading topic reviews...</div>
      ) : requests.length === 0 ? (
        <div className="topic-reviews-state is-empty">
          <BookOpenCheck size={34} />
          <h2>{assignedStudentCount === 0 ? "No students assigned" : "No topic reviews yet"}</h2>
          <p>
            {assignedStudentCount === 0
              ? "Assign students to your roster or squad to receive their topic review requests."
              : "A request appears here after a student completes the topic requirements and selects Submit for Mentor Review. The video submission sheet is linked above."}
          </p>
          <button type="button" className="topic-reviews-retry" onClick={() => refresh(true)} disabled={refreshing}>
            Refresh review requests
          </button>
        </div>
      ) : (
        <>
          <section className="topic-reviews-section">
            <h2><Clock size={17} /> Pending ({pending.length})</h2>
            {pending.length ? pending.map((request) => (
              <ReviewCard
                key={request.id}
                request={request}
                note={notes[request.id] || ""}
                onNoteChange={(value) => setNotes((current) => ({ ...current, [request.id]: value }))}
                onDecision={(decision) => decide(request, decision)}
                acting={actingId === request.id}
              />
            )) : <p className="topic-reviews-section-empty">No pending submissions.</p>}
          </section>

        </>
      )}

      {showReviewed && (
        <div
          className="topic-reviews-modal-backdrop"
          onClick={() => setShowReviewed(false)}
        >
          <section
            className="topic-reviews-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="topic-reviews-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="topic-reviews-modal-title">Reviewed topics</h2>
              <button
                type="button"
                aria-label="Close reviewed topics"
                onClick={() => setShowReviewed(false)}
              >
                <X size={18} />
              </button>
            </header>
            {history.length ? (
              <ul>
                {history.map((request) => {
                  const topic = TOPICS.get(request.topic_id);
                  return (
                    <li key={request.id}>
                      <strong>{request.student_name || "Student"}</strong>
                      <span>
                        Belt {request.belt_id} · {topic?.title || request.topic_id}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="topic-reviews-modal-empty">No reviewed topics yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function BeltLevelsImport({ onError }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const rows = await readBeltLevelRows(file);
      if (!rows.length) throw new Error("The selected file has no data rows.");
      const response = await importStudentBeltLevels(rows);
      setResult(response.results);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="topic-review-sheet belt-level-import">
      <header>
        <div>
          <h2>Update student belt levels</h2>
          <p>Upload CSV/XLSX with an email column and a final_belt_levels JSON column.</p>
        </div>
        <label className="topic-review-upload">
          {uploading ? "Importing..." : "Choose CSV or Excel"}
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} disabled={uploading} />
        </label>
      </header>
      {result && (
        <div className="belt-import-result" role="status">
          Updated {result.updated.length} · Skipped {result.skipped.length} · Invalid {result.invalid.length}
          {(result.skipped.length || result.invalid.length) > 0 && (
            <details>
              <summary>View skipped or invalid rows</summary>
              {[...result.skipped, ...result.invalid].map((item) => (
                <div key={`${item.row}-${item.reason}`}>Row {item.row}: {item.reason}</div>
              ))}
            </details>
          )}
        </div>
      )}
    </section>
  );
}
