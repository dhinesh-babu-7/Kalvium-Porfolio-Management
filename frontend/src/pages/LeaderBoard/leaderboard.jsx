import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboardData } from "../../api/routes/Public/leaderboard";
import { getPendingReviewStatus } from "../../api/routes/StudentDashboard/dashboard";
import "./leaderboard.css";

const POINTS = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

const STUDENTS_PER_PAGE = 10;

function cleanUsername(username) {
  if (!username) return "";

  if (username.includes("leetcode.com")) {
    const parts = username.replace(/\/$/, "").split("/");
    return parts[parts.length - 1];
  }

  return username;
}

function createAvatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "Student"
  )}&background=ffdddd&color=d71920&size=256`;
}

function Leaderboard() {
  const navigate = useNavigate();

  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [userPendingReview, setUserPendingReview] = useState({
    hasPendingReview: false,
    pendingReviewCount: 0,
  });

  // ============================================================
  // FETCH LEADERBOARD
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const leaderboardData = await getLeaderboardData();

        const rows = Array.isArray(leaderboardData)
          ? leaderboardData
          : leaderboardData?.data || [];

        const results = rows.map((entry) => {
          const profile = entry?.profiles || {};

          const easySolved = Number(entry?.easy_solved ?? 0);
          const mediumSolved = Number(entry?.medium_solved ?? 0);
          const hardSolved = Number(entry?.hard_solved ?? 0);

          const pendingReviewCount = Number(
            entry?.pending_review_count ?? 0
          );

          const isSuspended = Boolean(entry?.is_suspended);

          const isUnderReview =
            Boolean(entry?.is_under_review) ||
            isSuspended ||
            pendingReviewCount > 0;

          const studentName =
            profile?.name ||
            entry?.name ||
            entry?.leetcode_username ||
            "Student";

          const avatar =
            profile?.avatar_url?.trim()
              ? profile.avatar_url
              : createAvatarUrl(studentName);

          const totalSolved =
            entry?.total_solved != null
              ? Number(entry.total_solved)
              : easySolved + mediumSolved + hardSolved;

          const score = Number(entry?.score ?? 0);

          return {
            user_id:
              entry?.user_id ||
              entry?.profile_id ||
              entry?.id ||
              null,

            name: studentName,
            username: entry?.leetcode_username || "",
            avatar,

            easySolved,
            mediumSolved,
            hardSolved,
            total: totalSolved,
            score,

            ranking:
              entry?.ranking != null
                ? Number(entry.ranking)
                : null,

            pendingReviewCount,
            isSuspended,
            isUnderReview,
          };
        });

        const sorted = results.sort((a, b) => {
          // Normal students first, flagged/pending placed at the very end
          if (a.isUnderReview !== b.isUnderReview) {
            return a.isUnderReview ? 1 : -1;
          }

          // Higher score first
          if (b.score !== a.score) {
            return b.score - a.score;
          }

          // Higher total solved first
          if (b.total !== a.total) {
            return b.total - a.total;
          }

          // Better LeetCode ranking
          if (
            a.ranking != null &&
            b.ranking != null &&
            a.ranking !== b.ranking
          ) {
            return a.ranking - b.ranking;
          }

          return 0;
        });

        if (isMounted) {
          setRankings(sorted);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);

        if (isMounted) {
          setError(
            "Couldn't load the leaderboard. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================
  // CHECK CURRENT USER REVIEW STATUS
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    const checkPendingReview = async () => {
      try {
        const status = await getPendingReviewStatus();

        if (isMounted) {
          setUserPendingReview({
            hasPendingReview: Boolean(
              status?.hasPendingReview
            ),
            pendingReviewCount: Number(
              status?.pendingReviewCount ?? 0
            ),
          });
        }
      } catch (error) {
        console.error(
          "Failed to check pending review status:",
          error
        );
      }
    };

    checkPendingReview();

    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================
  // PODIUM
  // Only verified students can enter podium
  // ============================================================

  const verifiedStudents = rankings.filter(
    (student) => !student.isUnderReview
  );

  const flaggedStudents = rankings.filter(
    (student) => student.isUnderReview
  );

  const topThree = verifiedStudents.slice(0, 3);

  // ============================================================
  // PAGINATION
  // Move flagged/pending students to the end of the combined list
  // ============================================================

  const allRemainingStudents = [
    ...verifiedStudents.slice(3),
    ...flaggedStudents,
  ];

  const totalPages = Math.max(
    1,
    Math.ceil(
      allRemainingStudents.length / STUDENTS_PER_PAGE
    )
  );

  const startIndex =
    (currentPage - 1) * STUDENTS_PER_PAGE;

  const remainingStudents = allRemainingStudents.slice(
    startIndex,
    startIndex + STUDENTS_PER_PAGE
  );

  // ============================================================
  // HELPERS
  // ============================================================

  const getAvatar = (student) =>
    student?.avatar ||
    createAvatarUrl(student?.name);

  const handleStudentClick = (student) => {
    if (student?.user_id) {
      navigate(`/portfolio/${student.user_id}`);
    }
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) =>
      Math.min(prev + 1, totalPages)
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="leaderboard-page">

      <div
        className="leaderboard-wip-notice"
        style={{
          backgroundColor: "#fff3cd",
          color: "#856404",
          border: "1px solid #ffeeba",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: "500",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>
          🚧
        </span>

        <div>
          <strong>Under Maintenance:</strong>{" "}
          We are currently improving this page.
          Recent updates may take up to 24 hours to reflect.
        </div>
      </div>

      <div className="leaderboard-title">
        <div className="title-header-row">
          <h1>Leaderboard</h1>
        </div>

        <p>
          Rapid or suspicious consecutive solves may be
          flagged and sent to the
          <strong> Mentor Evaluation Queue</strong>.
          Flagged solves do not affect leaderboard ranking
          until reviewed.
        </p>

        <div className="points-legend">
          <span className="point-badge easy">
            Easy: {POINTS.easy} pt
          </span>

          <span className="point-badge medium">
            Medium: {POINTS.medium} pts
          </span>

          <span className="point-badge hard">
            Hard: {POINTS.hard} pts
          </span>

          <span className="point-badge review-info">
            🚩 Flagged Review Pending
          </span>
        </div>
      </div>

      {userPendingReview.hasPendingReview && (
        <div className="leaderboard-pending-notice">
          <div className="pending-notice-content">
            <span className="pending-icon">
              ⏳
            </span>

            <div>
              <strong>
                Your submissions are under mentor review
              </strong>

              <p>
                You have{" "}
                {userPendingReview.pendingReviewCount}{" "}
                submission
                {userPendingReview.pendingReviewCount !== 1
                  ? "s"
                  : ""}{" "}
                awaiting verification.
              </p>
            </div>
          </div>

          <button
            className="pending-notice-button"
            onClick={() => navigate("/profile")}
          >
            View Status
          </button>
        </div>
      )}

      {error && (
        <div className="leaderboard-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="leaderboard-loading">
          Loading leaderboard...
        </div>
      ) : rankings.length === 0 ? (
        <div className="leaderboard-empty">
          No students with a LeetCode profile yet.
        </div>
      ) : (
        <>
          {topThree.length > 0 && (
            <div className="podium">

              {topThree[1] && (
                <PodiumCard
                  student={topThree[1]}
                  position={2}
                  className="second-place"
                  onClick={handleStudentClick}
                />
              )}

              {topThree[0] && (
                <PodiumCard
                  student={topThree[0]}
                  position={1}
                  className="first-place"
                  onClick={handleStudentClick}
                />
              )}

              {topThree[2] && (
                <PodiumCard
                  student={topThree[2]}
                  position={3}
                  className="third-place"
                  onClick={handleStudentClick}
                />
              )}
            </div>
          )}

          {remainingStudents.length > 0 && (
            <div className="leaderboard-table">

              <div className="table-header">
                <span>RANK</span>
                <span>STUDENT</span>
                <span>EASY</span>
                <span>MEDIUM</span>
                <span>HARD</span>
                <span>TOTAL</span>
                <span>POINTS</span>
              </div>

              {remainingStudents.map((student, index) => {
                const isFlagged =
                  student.isUnderReview;

                const rank = isFlagged
                  ? "—"
                  : startIndex + index + 4;

                return (
                  <div
                    className={`table-row ${
                      isFlagged
                        ? "flagged-student-row"
                        : ""
                    }`}
                    key={
                      student.user_id ||
                      student.username ||
                      index
                    }
                    onClick={() =>
                      handleStudentClick(student)
                    }
                  >
                    <div className="table-rank">
                      {rank === "—"
                        ? "🚩"
                        : `#${rank}`}
                    </div>

                    <div className="table-student">
                      <img
                        src={getAvatar(student)}
                        alt={student.name}
                      />

                      <div>
                        <strong>
                          {student.name}
                        </strong>

                        <span>
                          @{cleanUsername(
                            student.username
                          )}
                        </span>
                      </div>

                      {student.isUnderReview && (
                        <span
                          className="table-pending-pill"
                          title="Under mentor review"
                        >
                          🚩 Flagged Review Pending
                        </span>
                      )}
                    </div>

                    <div className="easy-number">
                      {student.easySolved}
                    </div>

                    <div className="medium-number">
                      {student.mediumSolved}
                    </div>

                    <div className="hard-number">
                      {student.hardSolved}
                    </div>

                    <div className="total-number">
                      {student.total}
                    </div>

                    <div className="points-number">
                      {student.score}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <>
              <div className="leaderboard-pagination">

                <button
                  className="pagination-button"
                  disabled={currentPage === 1}
                  onClick={goToPreviousPage}
                >
                  ← Previous
                </button>

                <div className="pagination-pages">
                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      key={page}
                      className={`pagination-number ${
                        currentPage === page
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setCurrentPage(page)
                      }
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="pagination-button"
                  disabled={
                    currentPage === totalPages
                  }
                  onClick={goToNextPage}
                >
                  Next →
                </button>
              </div>

              <div className="pagination-info">
                Page {currentPage} of {totalPages}
                {" • "}
                Showing {remainingStudents.length} students
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// REUSABLE PODIUM CARD
// ============================================================

function PodiumCard({
  student,
  position,
  className,
  onClick,
}) {
  const avatar =
    student.avatar ||
    createAvatarUrl(student.name);

  return (
    <div
      className={`podium-card ${className}`}
      onClick={() => onClick(student)}
    >
      <img
        src={avatar}
        alt={student.name}
        className="podium-avatar"
      />

      <h2>{student.name}</h2>

      <p className="podium-username">
        @{cleanUsername(student.username)}
      </p>

      <div
        className={`podium-points-badge ${
          position === 1 ? "highlight" : ""
        }`}
      >
        <strong>{student.score}</strong> pts
      </div>

      <div className="problem-stats">
        <div>
          <strong className="easy-text">
            {student.easySolved}
          </strong>
          <span>Easy</span>
        </div>

        <div>
          <strong className="medium-text">
            {student.mediumSolved}
          </strong>
          <span>Medium</span>
        </div>

        <div>
          <strong className="hard-text">
            {student.hardSolved}
          </strong>
          <span>Hard</span>
        </div>
      </div>

      <div
        className={`podium-rank ${
          position === 1 ? "first-rank" : ""
        }`}
      >
        {position}
      </div>
    </div>
  );
}

export default Leaderboard;