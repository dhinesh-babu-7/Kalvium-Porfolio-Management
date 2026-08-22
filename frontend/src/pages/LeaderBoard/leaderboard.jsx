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

// ============================================================
// HELPER: CLEAN LEETCODE USERNAME
// ============================================================

function cleanUsername(username) {
  if (!username) return "";

  if (username.includes("leetcode.com")) {
    const parts = username.replace(/\/$/, "").split("/");
    return parts[parts.length - 1];
  }

  return username;
}

// ============================================================
// LEADERBOARD COMPONENT
// ============================================================

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
      setIsLoading(true);
      setError(null);

      try {
        const leaderboardData = await getLeaderboardData();

        console.log("LEADERBOARD RAW DATA:", leaderboardData);

        const rows = Array.isArray(leaderboardData)
          ? leaderboardData
          : [];

        const results = rows.map((entry) => {
          const profile = entry?.profiles || {};

          const easySolved = Number(entry?.easy_solved ?? 0);
          const mediumSolved = Number(entry?.medium_solved ?? 0);
          const hardSolved = Number(entry?.hard_solved ?? 0);

          // ============================================================
          // ANTI-CHEAT / MENTOR REVIEW STATUS
          // ============================================================

          const pendingReviewCount = Number(
            entry?.pending_review_count ?? 0
          );

          const isSuspended = entry?.is_suspended === true;

          const isFlagged =
            entry?.is_flagged === true ||
            entry?.flagged === true ||
            entry?.is_under_review === true ||
            pendingReviewCount > 0;

          const isUnderReview = isSuspended || isFlagged;

          console.log("STUDENT REVIEW CHECK:", {
            username: entry?.leetcode_username,
            pending_review_count: entry?.pending_review_count,
            is_flagged: entry?.is_flagged,
            flagged: entry?.flagged,
            is_under_review: entry?.is_under_review,
            is_suspended: entry?.is_suspended,
          });

          // ============================================================
          // AVATAR
          // ============================================================

          const studentName =
            profile?.name ||
            entry?.leetcode_username ||
            "Student";

          const avatar =
            profile?.avatar_url &&
              profile.avatar_url.trim() !== ""
              ? profile.avatar_url
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                studentName
              )}&background=ffdddd&color=d71920&size=256`;



          // ============================================================
          // TOTAL SOLVED
          // ============================================================

          const totalSolved =
            entry?.total_solved != null
              ? Number(entry.total_solved)
              : easySolved + mediumSolved + hardSolved;

          // ============================================================
          // SCORE
          // ============================================================

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

            ranking: entry?.ranking ?? null,

            pendingReviewCount,

            isSuspended,
            isFlagged,
            isUnderReview,
          };
        });

        if (!isMounted) return;

        // ============================================================
        // SORT
        // ============================================================

        const sorted = results.sort((a, b) => {
          // Students without review first
          if (a.isUnderReview !== b.isUnderReview) {
            return a.isUnderReview ? 1 : -1;
          }

          // Higher score first
          if (b.score !== a.score) {
            return b.score - a.score;
          }

          // If score is same, higher total solved first
          if (b.total !== a.total) {
            return b.total - a.total;
          }

          // If still same, use LeetCode ranking
          if (
            a.ranking != null &&
            b.ranking != null &&
            a.ranking !== b.ranking
          ) {
            return a.ranking - b.ranking;
          }

          return 0;
        });

        setRankings(sorted);

        // Reset pagination whenever leaderboard refreshes
        setCurrentPage(1);
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
  // CHECK PENDING REVIEW
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    const checkPendingReview = async () => {
      try {
        const status = await getPendingReviewStatus();

        if (isMounted) {
          setUserPendingReview({
            hasPendingReview:
              status?.hasPendingReview || false,

            pendingReviewCount:
              Number(status?.pendingReviewCount) || 0,
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
  // ============================================================

  const topThree = rankings.slice(0, 3);

  // ============================================================
  // PAGINATION
  // ============================================================

  // Students after top 3
  const allRemainingStudents = rankings.slice(3);

  const totalPages = Math.ceil(
    allRemainingStudents.length / STUDENTS_PER_PAGE
  );

  const startIndex =
    (currentPage - 1) * STUDENTS_PER_PAGE;

  const remainingStudents = allRemainingStudents.slice(
    startIndex,
    startIndex + STUDENTS_PER_PAGE
  );

  // ============================================================
  // AVATAR
  // ============================================================

  const getAvatar = (student) => {
    if (student?.avatar) {
      return student.avatar;
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      student?.name || "Student"
    )}&background=ffdddd&color=d71920&size=256`;
  };

  // ============================================================
  // STUDENT CLICK
  // ============================================================

  const handleStudentClick = (student) => {
    if (student?.user_id) {
      navigate(`/portfolio/${student.user_id}`);
    }
  };

  // ============================================================
  // PAGINATION HANDLERS
  // ============================================================

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) =>
      Math.min(prev + 1, totalPages)
    );
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="leaderboard-page">
      {/* ============================================================
          PAGE HEADER
      ============================================================ */}

      <div className="leaderboard-title">
        <div className="title-header-row">
          <h1>Leaderboard</h1>
        </div>

        <p>
          Rapid or suspicious consecutive solves are automatically 
          flagged by AI and held in the
          <strong> Mentor Evaluation Queue</strong> before
          point allocation.
        </p>

        {/* POINTS LEGEND */}

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
            🕒 Flagged Solves = Held for Review
          </span>
        </div>
      </div>

      {/* ============================================================
          PENDING REVIEW NOTICE
      ============================================================ */}

      {userPendingReview.hasPendingReview && (
        <div className="leaderboard-pending-notice">
          <div className="pending-notice-content">
            <span className="pending-icon">⏳</span>

            <div>
              <strong>
                Your submissions are under mentor review
              </strong>

              <p>
                You have{" "}
                {userPendingReview.pendingReviewCount}{" "}
                rapid submission
                {userPendingReview.pendingReviewCount !== 1
                  ? "s"
                  : ""}{" "}
                awaiting verification. Once approved,
                you'll appear on the leaderboard.
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

      {/* ============================================================
          ERROR
      ============================================================ */}

      {error && (
        <div className="leaderboard-error">
          {error}
        </div>
      )}

      {/* ============================================================
          LOADING / EMPTY / CONTENT
      ============================================================ */}

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
          {/* ========================================================
              TOP 3 PODIUM
          ======================================================== */}

          {topThree.length > 0 && (
            <div className="podium">
              {/* ======================================================
                  SECOND PLACE
              ====================================================== */}

              {topThree[1] && (
                <div
                  className="podium-card second-place"
                  onClick={() =>
                    handleStudentClick(topThree[1])
                  }
                >
                  <img
                    src={getAvatar(topThree[1])}
                    alt={topThree[1].name}
                    className="podium-avatar"
                  />

                  <h2>{topThree[1].name}</h2>

                  <p className="podium-username">
                    @{cleanUsername(topThree[1].username)}
                  </p>

                  <div className="podium-points-badge">
                    <strong>
                      {topThree[1].score}
                    </strong>{" "}
                    pts
                  </div>

                  {topThree[1].isUnderReview && (
                    <div
                      className="flagged-review-badge"
                      title="This student's submissions are under review"
                    >
                      🚩 Flagged - Under Review
                    </div>
                  )}

                  <div className="problem-stats">
                    <div>
                      <strong className="easy-text">
                        {topThree[1].easySolved}
                      </strong>
                      <span>Easy</span>
                    </div>

                    <div>
                      <strong className="medium-text">
                        {topThree[1].mediumSolved}
                      </strong>
                      <span>Medium</span>
                    </div>

                    <div>
                      <strong className="hard-text">
                        {topThree[1].hardSolved}
                      </strong>
                      <span>Hard</span>
                    </div>
                  </div>

                  <div className="podium-rank">
                    2
                  </div>
                </div>
              )}

              {/* ======================================================
                  FIRST PLACE
              ====================================================== */}

              {topThree[0] && (
                <div
                  className="podium-card first-place"
                  onClick={() =>
                    handleStudentClick(topThree[0])
                  }
                >
                  <img
                    src={getAvatar(topThree[0])}
                    alt={topThree[0].name}
                    className="podium-avatar"
                  />

                  <h2>{topThree[0].name}</h2>

                  <p className="podium-username">
                    @{cleanUsername(topThree[0].username)}
                  </p>

                  <div className="podium-points-badge highlight">
                    <strong>
                      {topThree[0].score}
                    </strong>{" "}
                    pts
                  </div>

                  {topThree[0].isUnderReview && (
                    <div
                      className="flagged-review-badge"
                      title="This student's submissions are under review"
                    >
                      🚩 Flagged - Under Review
                    </div>
                  )}

                  <div className="problem-stats">
                    <div>
                      <strong className="easy-text">
                        {topThree[0].easySolved}
                      </strong>
                      <span>Easy</span>
                    </div>

                    <div>
                      <strong className="medium-text">
                        {topThree[0].mediumSolved}
                      </strong>
                      <span>Medium</span>
                    </div>

                    <div>
                      <strong className="hard-text">
                        {topThree[0].hardSolved}
                      </strong>
                      <span>Hard</span>
                    </div>
                  </div>

                  <div className="podium-rank first-rank">
                    1
                  </div>
                </div>
              )}

              {/* ======================================================
                  THIRD PLACE
              ====================================================== */}

              {topThree[2] && (
                <div
                  className="podium-card third-place"
                  onClick={() =>
                    handleStudentClick(topThree[2])
                  }
                >
                  <img
                    src={getAvatar(topThree[2])}
                    alt={topThree[2].name}
                    className="podium-avatar"
                  />

                  <h2>{topThree[2].name}</h2>

                  <p className="podium-username">
                    @{cleanUsername(topThree[2].username)}
                  </p>

                  <div className="podium-points-badge">
                    <strong>
                      {topThree[2].score}
                    </strong>{" "}
                    pts
                  </div>

                  {topThree[2].isUnderReview && (
                    <div
                      className="flagged-review-badge"
                      title="This student's submissions are under review"
                    >
                      🚩 Flagged - Under Review
                    </div>
                  )}

                  <div className="problem-stats">
                    <div>
                      <strong className="easy-text">
                        {topThree[2].easySolved}
                      </strong>
                      <span>Easy</span>
                    </div>

                    <div>
                      <strong className="medium-text">
                        {topThree[2].mediumSolved}
                      </strong>
                      <span>Medium</span>
                    </div>

                    <div>
                      <strong className="hard-text">
                        {topThree[2].hardSolved}
                      </strong>
                      <span>Hard</span>
                    </div>
                  </div>

                  <div className="podium-rank">
                    3
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TABLE
          ======================================================== */}

          {remainingStudents.length > 0 && (
            <div className="leaderboard-table">
              {/* TABLE HEADER */}

              <div className="table-header">
                <span>RANK</span>
                <span>STUDENT</span>
                <span>EASY</span>
                <span>MEDIUM</span>
                <span>HARD</span>
                <span>TOTAL</span>
                <span>POINTS</span>
              </div>

              {/* TABLE ROWS */}

              {remainingStudents.map((student, index) => {
                const rank = startIndex + index + 4;

                return (
                  <div
                    className="table-row"
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
                      #{rank}
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
                          className="flagged-review-pill"
                          title="This student's submissions are under mentor review"
                        >
                          🚩 Flagged - Under Review
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

          {/* ========================================================
              PAGINATION
          ======================================================== */}

          {totalPages > 1 && (
            <div className="leaderboard-pagination">
              {/* PREVIOUS */}

              <button
                className="pagination-button"
                disabled={currentPage === 1}
                onClick={goToPreviousPage}
              >
                ← Previous
              </button>

              {/* PAGE NUMBERS */}

              <div className="pagination-pages">
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                ).map((page) => (
                  <button
                    key={page}
                    className={`pagination-number ${currentPage === page
                      ? "active"
                      : ""
                      }`}
                    onClick={() =>
                      goToPage(page)
                    }
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* NEXT */}

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
          )}

          {/* ========================================================
              PAGE INFO
          ======================================================== */}

          {totalPages > 1 && (
            <div className="pagination-info">
              Page {currentPage} of {totalPages}
              {" • "}
              Showing {remainingStudents.length} students
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Leaderboard;