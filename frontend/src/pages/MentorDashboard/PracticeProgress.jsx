import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";

import { getPracticeProgress } from "../../api/routes/MentorDashboard/main.js";
import Belt1 from "../studentdashboard/belts/Belt1.jsx";
import Belt2 from "../studentdashboard/belts/Belt2.jsx";
import Belt3 from "../studentdashboard/belts/Belt3.jsx";
import Belt4 from "../studentdashboard/belts/Belt4.jsx";
import Belt5 from "../studentdashboard/belts/Belt5.jsx";
import Belt6 from "../studentdashboard/belts/Belt6.jsx";
import Belt7 from "../studentdashboard/belts/Belt7.jsx";
import "./practice-progress.css";

const BELTS = [Belt1, Belt2, Belt3, Belt4, Belt5, Belt6, Belt7];

function getErrorMessage(error) {
  const serverMessage = error?.response?.data?.error;
  if (serverMessage) return serverMessage;
  if (error?.message === "Network Error") {
    return "Could not reach the server. Check your connection and try again.";
  }
  return error?.message || "Could not load practice progress. Please try again.";
}

function getProgressByTopic(student) {
  return new Map((student.progress || []).map((row) => [row.topic_id, row]));
}

function getSolvedProblemIndexes(row, problemCount) {
  return new Set(
    (Array.isArray(row?.solved_problems) ? row.solved_problems : [])
      .map(Number)
      .filter((index) => Number.isInteger(index) && index >= 0 && index < problemCount)
  );
}

function getBeltStats(student, belt) {
  const progressByTopic = getProgressByTopic(student);
  let solvedProblems = 0;
  let totalProblems = 0;
  let completedTopics = 0;

  for (const topic of belt.topics) {
    const row = progressByTopic.get(topic.id);
    solvedProblems += getSolvedProblemIndexes(row, topic.problems.length).size;
    totalProblems += topic.problems.length;
    if (row?.completed === true) completedTopics += 1;
  }

  return {
    solvedProblems,
    totalProblems,
    completedTopics,
    totalTopics: belt.topics.length,
    completed: completedTopics === belt.topics.length,
  };
}

function getCurrentBelt(student) {
  const progressByTopic = getProgressByTopic(student);
  return BELTS.find((belt) =>
    !belt.topics.every((topic) => progressByTopic.get(topic.id)?.completed === true)
  ) || BELTS[BELTS.length - 1];
}

function StudentPracticeStats({ student, belt, onClose }) {
  const progressByTopic = getProgressByTopic(student);
  const stats = getBeltStats(student, belt);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-card modal-card-large"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-stats-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-header-info">
            {student.avatar_url ? (
              <img src={student.avatar_url} alt="" className="student-avatar-img" />
            ) : (
              <div className="student-avatar generic-avatar" aria-hidden="true">
                {student.name?.charAt(0) || "S"}
              </div>
            )}
            <div>
              <div className="modal-title-row">
                <h3 id="practice-stats-title">{student.name}</h3>
                <span className="squad-badge">Squad {student.squad_id || "N/A"}</span>
              </div>
              <p className="subtext">{student.email || "Practice progress"}</p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close stats">
            <X size={20} />
          </button>
        </header>

        <div className="modal-body practice-progress-modal-body">
          <section className="practice-progress-belt-summary">
            <div className="practice-progress-belt-icon">
              <BookOpenCheck size={22} />
            </div>
            <div className="practice-progress-belt-copy">
              <span className="practice-progress-eyebrow">CURRENT BELT</span>
              <h4>{belt.title} · {belt.subtitle}</h4>
              <span className={stats.completed ? "practice-progress-complete-label" : "practice-progress-in-progress-label"}>
                {stats.completed ? "Belt completed" : "In progress"}
              </span>
            </div>
            <div className="practice-progress-belt-metrics">
              <strong>{stats.solvedProblems}/{stats.totalProblems}</strong>
              <span>questions solved</span>
            </div>
          </section>

          <div className="practice-progress-stats-heading">
            <span className="section-title">SOLVED QUESTIONS IN {belt.title.toUpperCase()}</span>
            <span>{stats.completedTopics}/{stats.totalTopics} topics completed</span>
          </div>

          {stats.solvedProblems === 0 ? (
            <div className="practice-progress-empty">
              No questions have been marked solved in this belt yet.
            </div>
          ) : (
            <div className="practice-progress-solved-list">
              {belt.topics.map((topic) => {
                const solved = getSolvedProblemIndexes(
                  progressByTopic.get(topic.id),
                  topic.problems.length
                );
                if (solved.size === 0) return null;

                return (
                  <section className="practice-progress-solved-topic" key={topic.id}>
                    <div className="practice-progress-solved-topic-heading">
                      <strong>{topic.title}</strong>
                      <span>{solved.size}/{topic.problems.length} solved</span>
                    </div>
                    <ul>
                      {[...solved].sort((a, b) => a - b).map((problemIndex) => (
                        <li key={`${topic.id}-${problemIndex}`}>
                          <CheckCircle2 size={16} />
                          <span>{topic.problems[problemIndex]}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function PracticeProgress() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      setLoading(true);
      setError("");

      try {
        const response = await getPracticeProgress();
        if (!cancelled) setStudents(response.students || []);
      } catch (loadError) {
        if (!cancelled) setError(getErrorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      `${student.name} ${student.email}`.toLowerCase().includes(query)
    );
  }, [search, students]);

  return (
    <div className="practice-progress-page">
      <header className="practice-progress-header">
        <div>
          <p className="practice-progress-eyebrow">STUDENT DOJO</p>
          <h1>Practice Progress</h1>
          <p>Review assigned students’ current belt and practice question completion.</p>
        </div>
      </header>

      <div className="practice-progress-toolbar">
        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search</span>
          <input
            type="search"
            placeholder="Search assigned students..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <span className="practice-progress-student-count">
          {filteredStudents.length} assigned student{filteredStudents.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="practice-progress-state" role="status">
          <LoaderCircle className="practice-progress-spinner" size={22} />
          Loading assigned student practice progress…
        </div>
      ) : error ? (
        <div className="practice-progress-state is-error" role="alert">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : students.length === 0 ? (
        <div className="practice-progress-state">
          No students are currently assigned to you.
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="practice-progress-state">
          No assigned students match “{search}”.
        </div>
      ) : (
        <div className="table-wrapper practice-progress-table-wrapper">
          <table className="responsive-table practice-progress-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Squad</th>
                <th>Current Belt</th>
                <th>Belt Progress</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const currentBelt = getCurrentBelt(student);
                const stats = getBeltStats(student, currentBelt);

                return (
                  <tr key={student.student_user_id}>
                    <td data-label="Student">
                      <div className="student-profile-cell">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="" className="student-avatar-img" />
                        ) : (
                          <div className="student-avatar generic-avatar" aria-hidden="true">
                            {student.name?.charAt(0) || "S"}
                          </div>
                        )}
                        <div className="student-info">
                          <span className="student-name">{student.name}</span>
                          <span className="email-text">{student.email || "No email available"}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Squad">
                      <span className="squad-badge">Squad {student.squad_id || "N/A"}</span>
                    </td>
                    <td data-label="Current Belt">
                      <span className="practice-progress-current-belt">
                        <BookOpenCheck size={16} />
                        <span>
                          <strong>{currentBelt.title}</strong>
                          <small>{currentBelt.subtitle}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Belt Progress">
                      <span className="practice-progress-belt-count">
                        <span className="practice-progress-belt-track" aria-hidden="true">
                          <span
                            style={{
                              width: `${stats.totalTopics ? (stats.completedTopics / stats.totalTopics) * 100 : 0}%`,
                            }}
                          />
                        </span>
                        {stats.completedTopics}/{stats.totalTopics} topics
                      </span>
                      <span className="practice-progress-solved-count">
                        {stats.solvedProblems}/{stats.totalProblems} questions solved
                      </span>
                    </td>
                    <td data-label="Actions" className="text-right">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <ExternalLink size={14} /> View Stats
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedStudent && (
        <StudentPracticeStats
          student={selectedStudent}
          belt={getCurrentBelt(selectedStudent)}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
