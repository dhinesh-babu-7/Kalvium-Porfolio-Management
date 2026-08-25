import express from "express";
import rateLimit from "express-rate-limit";

import {
  createAuthedSupabaseClient,
  supabase,
  supabaseAdmin,
} from "../config/supabase.js";

const router = express.Router();

// ============================================================
// RATE LIMIT
// ============================================================

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many review requests. Please try again later.",
  },
});

const saveSquadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

// ============================================================
// AUTHENTICATION
// ============================================================

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Missing authentication token",
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(
        "[MENTOR REVIEW AUTH ERROR]",
        authError
      );

      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    req.user = user;

    // Keep authenticated client available if needed elsewhere.
    req.authedSupabase =
      createAuthedSupabaseClient(token);

    // --------------------------------------------------------
    // IMPORTANT
    //
    // Mentor dashboard database operations use supabaseAdmin.
    // This avoids RLS hiding mentor/student/submission rows.
    // --------------------------------------------------------

    if (!supabaseAdmin) {
      console.error(
        "[MENTOR REVIEW] SUPABASE_SERVICE_KEY is missing."
      );

      return res.status(500).json({
        success: false,
        error: "Server database configuration is incomplete",
      });
    }

    req.adminSupabase = supabaseAdmin;

    next();
  } catch (error) {
    console.error(
      "[MENTOR REVIEW AUTH EXCEPTION]",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

// ============================================================
// SQUAD MANAGEMENT
// ============================================================

router.get("/getsquads", requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.adminSupabase
      .from("mentor_squads")
      .select("squad_id")
      .eq("mentor_user_id", req.user.id);

    if (error) {
      console.error("[MENTOR SQUADS] Fetch error:", error);
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      squads: (data || []).map((item) => item.squad_id),
    });
  } catch (error) {
    console.error("[MENTOR SQUADS] Fetch exception:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.post(
  "/savesquad",
  saveSquadLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const { squads } = req.body;

      if (!Array.isArray(squads)) {
        return res.status(400).json({
          success: false,
          error: "Squads must be an array",
        });
      }

      const squadList = [
        ...new Set(
          squads.map((squadId) => Number(squadId)).filter(Number.isInteger),
        ),
      ];

      if (squadList.length !== squads.length) {
        return res.status(400).json({
          success: false,
          error: "Squads must contain valid numeric IDs",
        });
      }

      const db = req.adminSupabase;
      const mentorUserId = req.user.id;

      const { error: deleteError } = await db
        .from("mentor_squads")
        .delete()
        .eq("mentor_user_id", mentorUserId);

      if (deleteError) {
        console.error("[MENTOR SQUADS] Delete error:", deleteError);
        return res.status(400).json({
          success: false,
          error: deleteError.message,
        });
      }

      if (squadList.length === 0) {
        return res.status(200).json({
          success: true,
          message: "All squad assignments cleared",
          data: [],
        });
      }

      const { data, error: insertError } = await db
        .from("mentor_squads")
        .insert(
          squadList.map((squadId) => ({
            mentor_user_id: mentorUserId,
            squad_id: squadId,
          })),
        )
        .select();

      if (insertError) {
        console.error("[MENTOR SQUADS] Insert error:", insertError);
        return res.status(400).json({
          success: false,
          error: insertError.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Squads saved successfully",
        data,
      });
    } catch (error) {
      console.error("[MENTOR SQUADS] Save exception:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
);

router.get("/students", requireAuth, async (req, res) => {
  try {
    const db = req.adminSupabase;
    const { data: mentorSquads, error: squadError } = await db
      .from("mentor_squads")
      .select("squad_id")
      .eq("mentor_user_id", req.user.id);

    if (squadError) {
      return res.status(400).json({ success: false, error: squadError.message });
    }

    const squadIds = (mentorSquads || []).map((item) => item.squad_id);
    const requestedSquadId = req.query.squad_id;
    if (requestedSquadId !== undefined) {
      const squadId = Number(requestedSquadId);
      if (!Number.isInteger(squadId) || !squadIds.includes(squadId)) {
        return res.status(403).json({ success: false, error: "You are not assigned to this squad" });
      }
      squadIds.splice(0, squadIds.length, squadId);
    }

    if (squadIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, students: [] });
    }

    const { data: profiles, error: profileError } = await db
      .from("profiles")
      .select("*")
      .in("squad_id", squadIds);
    if (profileError) {
      return res.status(400).json({ success: false, error: profileError.message });
    }

    const studentIds = (profiles || []).map((profile) => profile.user_id).filter(Boolean);
    const { data: leaderboard, error: leaderboardError } = studentIds.length
      ? await db.from("leetcode_leaderboard").select("*").in("user_id", studentIds)
      : { data: [], error: null };
    if (leaderboardError) {
      return res.status(400).json({ success: false, error: leaderboardError.message });
    }

    const leaderboardMap = new Map((leaderboard || []).map((row) => [String(row.user_id), row]));
    const students = (profiles || []).map((profile) => ({
      ...profile,
      ...(leaderboardMap.get(String(profile.user_id)) || {}),
      id: profile.user_id || profile.id,
      student_user_id: profile.user_id || profile.id,
    }));

    return res.status(200).json({ success: true, count: students.length, students });
  } catch (error) {
    console.error("[MENTOR STUDENTS] Fetch exception:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/assigned-students", requireAuth, async (req, res) => {
  try {
    const db = req.adminSupabase;
    const { data: assignments, error: assignmentError } = await db
      .from("squad_students")
      .select("squad_id, student_user_id, assigned_at")
      .eq("mentor_user_id", req.user.id);
    if (assignmentError) {
      return res.status(400).json({ success: false, error: assignmentError.message });
    }
    if (!assignments?.length) {
      return res.status(200).json({ success: true, students: [] });
    }

    const studentIds = assignments.map((assignment) => assignment.student_user_id);
    const [{ data: profiles, error: profileError }, { data: leaderboard, error: leaderboardError }] = await Promise.all([
      db.from("profiles").select("*").in("user_id", studentIds),
      db.from("leetcode_leaderboard").select("*").in("user_id", studentIds),
    ]);
    if (profileError || leaderboardError) {
      const error = profileError || leaderboardError;
      return res.status(400).json({ success: false, error: error.message });
    }

    const profileMap = new Map((profiles || []).map((profile) => [String(profile.user_id), profile]));
    const leaderboardMap = new Map((leaderboard || []).map((row) => [String(row.user_id), row]));
    const students = assignments.map((assignment) => {
      const profile = profileMap.get(String(assignment.student_user_id)) || {};
      return {
        ...profile,
        ...(leaderboardMap.get(String(assignment.student_user_id)) || {}),
        id: profile.user_id || profile.id || assignment.student_user_id,
        student_user_id: assignment.student_user_id,
        squad_id: assignment.squad_id ?? profile.squad_id,
        assigned_at: assignment.assigned_at,
      };
    });

    return res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("[MENTOR ASSIGNED STUDENTS] Fetch exception:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ============================================================
// HELPER: GET STUDENTS MENTOR CAN REVIEW
// ============================================================

const getMentorReviewStudents = async (
  db,
  mentorUserId
) => {
  console.log(
    "[MENTOR REVIEW] Loading mentor assignments..."
  );

  // ----------------------------------------------------------
  // 1. GET MENTOR'S ASSIGNED SQUADS
  // ----------------------------------------------------------

  const {
    data: mentorSquads,
    error: mentorSquadsError,
  } = await db
    .from("mentor_squads")
    .select("squad_id")
    .eq("mentor_user_id", mentorUserId);

  if (mentorSquadsError) {
    throw new Error(
      `Failed to load mentor squads: ${mentorSquadsError.message}`
    );
  }

  const squadIds = [
    ...new Set(
      (mentorSquads || [])
        .map((item) => item.squad_id)
        .filter(
          (id) =>
            id !== null &&
            id !== undefined
        )
    ),
  ];

  console.log(
    "[MENTOR REVIEW] Mentor squad IDs:",
    squadIds
  );

  // ----------------------------------------------------------
  // 2. GET DIRECTLY ASSIGNED STUDENTS
  // ----------------------------------------------------------

  const {
    data: directAssignments,
    error: directAssignmentError,
  } = await db
    .from("squad_students")
    .select(`
      student_user_id,
      squad_id,
      assigned_at
    `)
    .eq("mentor_user_id", mentorUserId);

  if (directAssignmentError) {
    throw new Error(
      `Failed to load assigned students: ${directAssignmentError.message}`
    );
  }

  console.log(
    "[MENTOR REVIEW] Direct assignments:",
    directAssignments || []
  );

  // ----------------------------------------------------------
  // 3. GET STUDENTS THROUGH MENTOR'S SQUADS
  // ----------------------------------------------------------

  let squadProfiles = [];

  if (squadIds.length > 0) {
    const {
      data,
      error,
    } = await db
      .from("profiles")
      .select(`
        user_id,
        squad_id
      `)
      .in("squad_id", squadIds);

    if (error) {
      throw new Error(
        `Failed to load squad students: ${error.message}`
      );
    }

    squadProfiles = data || [];
  }

  console.log(
    "[MENTOR REVIEW] Students from squads:",
    squadProfiles
  );

  // ----------------------------------------------------------
  // 4. MERGE STUDENTS
  // ----------------------------------------------------------

  const studentMap = new Map();

  // Direct mentor -> student assignments
  for (const assignment of directAssignments || []) {
    if (!assignment.student_user_id) {
      continue;
    }

    const studentId = String(
      assignment.student_user_id
    );

    studentMap.set(studentId, {
      student_user_id:
        assignment.student_user_id,

      squad_id:
        assignment.squad_id ?? null,

      assigned_at:
        assignment.assigned_at ?? null,
    });
  }

  // Students belonging to mentor squads
  for (const profile of squadProfiles || []) {
    if (!profile.user_id) {
      continue;
    }

    const studentId = String(
      profile.user_id
    );

    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student_user_id:
          profile.user_id,

        squad_id:
          profile.squad_id ?? null,

        assigned_at: null,
      });
    }
  }

  const students =
    Array.from(studentMap.values());

  console.log(
    "[MENTOR REVIEW] Final mentor students:",
    students
  );

  return {
    squadIds,
    students,
  };
};

// ============================================================
// HELPER: VERIFY MENTOR ACCESS
// ============================================================

const verifyMentorCanReviewStudent = async (
  db,
  mentorUserId,
  studentUserId
) => {
  const {
    students,
  } = await getMentorReviewStudents(
    db,
    mentorUserId
  );

  return (
    students.find(
      (student) =>
        String(
          student.student_user_id
        ) === String(studentUserId)
    ) || null
  );
};

// ============================================================
// HELPER: UPDATE LEADERBOARD REVIEW STATUS
// ============================================================

const updateStudentReviewStatus = async (
  db,
  studentUserId
) => {
  // ----------------------------------------------------------
  // PENDING COUNT
  // ----------------------------------------------------------

  const {
    count: pendingCount,
    error: pendingError,
  } = await db
    .from("leetcode_submissions")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", studentUserId)
    .eq("review_status", "pending");

  if (pendingError) {
    throw new Error(
      `Failed to count pending submissions: ${pendingError.message}`
    );
  }

  // ----------------------------------------------------------
  // REJECTED COUNT
  // ----------------------------------------------------------

  const {
    count: rejectedCount,
    error: rejectedError,
  } = await db
    .from("leetcode_submissions")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", studentUserId)
    .eq("review_status", "rejected");

  if (rejectedError) {
    throw new Error(
      `Failed to count rejected submissions: ${rejectedError.message}`
    );
  }

  const hasPendingReviews =
    Number(pendingCount || 0) > 0;

  const hasRejectedReviews =
    Number(rejectedCount || 0) > 0;

  let isSuspended = false;
  let suspensionReason = null;

  // ----------------------------------------------------------
  // SUSPENSION LOGIC
  // ----------------------------------------------------------

  if (hasRejectedReviews) {
    isSuspended = true;

    suspensionReason =
      "Rejected for suspicious submission patterns";
  } else if (hasPendingReviews) {
    isSuspended = true;

    suspensionReason =
      "Pending mentor review for suspicious submission patterns";
  }

  // ----------------------------------------------------------
  // UPDATE LEADERBOARD
  // ----------------------------------------------------------

  const {
    error: leaderboardError,
  } = await db
    .from("leetcode_leaderboard")
    .update({
      is_suspended: isSuspended,
      suspension_reason: suspensionReason,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", studentUserId);

  if (leaderboardError) {
    throw new Error(
      `Failed to update leaderboard status: ${leaderboardError.message}`
    );
  }

  return {
    pendingCount: Number(pendingCount || 0),
    rejectedCount: Number(rejectedCount || 0),
    hasPendingReviews,
    hasRejectedReviews,
    isSuspended,
    suspensionReason,
  };
};

// ============================================================
// GET MENTOR REVIEW QUEUE
//
// GET /leetcode-review/queue
// ============================================================

router.get(
  "/leetcode-review/queue",
  reviewLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const mentorUserId = req.user.id;

      // IMPORTANT:
      // Use admin client so RLS does not hide submissions.
      const db = req.adminSupabase;

      console.log(
        "================================================"
      );

      console.log(
        "[MENTOR REVIEW] Loading queue..."
      );

      console.log(
        "[MENTOR REVIEW] Mentor ID:",
        mentorUserId
      );

      // ------------------------------------------------------
      // STEP 1: GET MENTOR STUDENTS
      // ------------------------------------------------------

      const {
        squadIds,
        students: reviewStudents,
      } = await getMentorReviewStudents(
        db,
        mentorUserId
      );

      console.log(
        "[MENTOR REVIEW] Mentor squads:",
        squadIds
      );

      console.log(
        "[MENTOR REVIEW] Review students:",
        reviewStudents
      );

      if (reviewStudents.length === 0) {
        console.log(
          "[MENTOR REVIEW] No assigned students."
        );

        return res.status(200).json({
          success: true,
          count: 0,
          reviews: [],
        });
      }

      // ------------------------------------------------------
      // STEP 2: STUDENT IDS
      // ------------------------------------------------------

      const studentIds =
        reviewStudents
          .map(
            (student) =>
              student.student_user_id
          )
          .filter(Boolean);

      console.log(
        "[MENTOR REVIEW] Student IDs:",
        studentIds
      );

      if (studentIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          reviews: [],
        });
      }

      // ------------------------------------------------------
      // STEP 3: LOAD ALL SUBMISSIONS
      // ------------------------------------------------------

      console.log(
        "[MENTOR REVIEW] STEP 3: Loading ALL submissions..."
      );

      const {
        data: allSubmissions,
        error: allSubmissionError,
      } = await db
        .from("leetcode_submissions")
        .select(`
          id,
          user_id,
          submission_id,
          title_slug,
          difficulty,
          submitted_at,
          flag_reason,
          review_status,
          status,
          created_at
        `)
        .in("user_id", studentIds)
        .order("submitted_at", {
          ascending: false,
        });

      console.log(
        "[MENTOR REVIEW] ALL submissions error:",
        allSubmissionError
      );

      console.log(
        "[MENTOR REVIEW] ALL submission count:",
        allSubmissions?.length || 0
      );

      if (allSubmissionError) {
        console.error(
          "[MENTOR REVIEW] ALL submissions query failed:",
          allSubmissionError
        );
      }

      // ------------------------------------------------------
      // STEP 4: LOAD PENDING SUBMISSIONS
      // ------------------------------------------------------

      console.log(
        "[MENTOR REVIEW] STEP 4: Loading pending submissions..."
      );

      const {
        data: pendingSubmissions,
        error: submissionError,
      } = await db
        .from("leetcode_submissions")
        .select(`
          id,
          user_id,
          submission_id,
          title_slug,
          difficulty,
          submitted_at,
          flag_reason,
          review_status,
          status,
          created_at
        `)
        .in("user_id", studentIds)
        .eq("review_status", "pending")
        .order("submitted_at", {
          ascending: false,
        });

      console.log(
        "[MENTOR REVIEW] Pending submissions error:",
        submissionError
      );

      console.log(
        "[MENTOR REVIEW] Pending submissions:",
        pendingSubmissions
      );

      console.log(
        "[MENTOR REVIEW] Pending submission count:",
        pendingSubmissions?.length || 0
      );

      // ------------------------------------------------------
      // HANDLE QUERY ERROR
      // ------------------------------------------------------

      if (submissionError) {
        console.error(
          "[MENTOR REVIEW] Pending query failed:",
          submissionError
        );

        return res.status(400).json({
          success: false,
          error: submissionError.message,
        });
      }

      // ------------------------------------------------------
      // NO PENDING REVIEWS
      // ------------------------------------------------------

      if (
        !pendingSubmissions ||
        pendingSubmissions.length === 0
      ) {
        console.log(
          "[MENTOR REVIEW] No pending submissions."
        );

        return res.status(200).json({
          success: true,
          count: 0,
          reviews: [],
        });
      }

      // ------------------------------------------------------
      // STEP 5: PENDING STUDENT IDS
      // ------------------------------------------------------

      const pendingStudentIds = [
        ...new Set(
          pendingSubmissions
            .map(
              (submission) =>
                submission.user_id
            )
            .filter(Boolean)
        ),
      ];

      console.log(
        "[MENTOR REVIEW] Pending student IDs:",
        pendingStudentIds
      );

      // ------------------------------------------------------
      // STEP 6: GET PROFILES
      // ------------------------------------------------------

      const {
        data: profiles,
        error: profileError,
      } = await db
        .from("profiles")
        .select(`
          id,
          user_id,
          name,
          avatar_url,
          squad_id,
          leetcode
        `)
        .in("user_id", pendingStudentIds);

      if (profileError) {
        console.error(
          "[MENTOR REVIEW] Profile error:",
          profileError
        );

        return res.status(400).json({
          success: false,
          error: profileError.message,
        });
      }

      console.log(
        "[MENTOR REVIEW] Profiles:",
        profiles
      );

      // ------------------------------------------------------
      // STEP 7: GET LEADERBOARD
      // ------------------------------------------------------

      const {
        data: leaderboardData,
        error: leaderboardError,
      } = await db
        .from("leetcode_leaderboard")
        .select(`
          id,
          profile_id,
          user_id,
          leetcode_username,
          easy_solved,
          medium_solved,
          hard_solved,
          total_solved,
          ranking,
          score,
          updated_at,
          last_solved_at,
          is_leetcode_active,
          is_suspended,
          suspension_reason
        `)
        .in("user_id", pendingStudentIds);

      if (leaderboardError) {
        console.error(
          "[MENTOR REVIEW] Leaderboard error:",
          leaderboardError
        );

        return res.status(400).json({
          success: false,
          error: leaderboardError.message,
        });
      }

      console.log(
        "[MENTOR REVIEW] Leaderboard rows:",
        leaderboardData
      );

      // ------------------------------------------------------
      // STEP 8: CREATE MAPS
      // ------------------------------------------------------

      const profileMap = new Map();

      for (const profile of profiles || []) {
        if (profile.user_id) {
          profileMap.set(
            String(profile.user_id),
            profile
          );
        }
      }

      const leaderboardMap = new Map();

      for (
        const row of leaderboardData || []
      ) {
        if (row.user_id) {
          leaderboardMap.set(
            String(row.user_id),
            row
          );
        }
      }

      const assignmentMap = new Map();

      for (
        const student of reviewStudents
      ) {
        assignmentMap.set(
          String(
            student.student_user_id
          ),
          student
        );
      }

      // ------------------------------------------------------
      // STEP 9: GROUP PENDING SUBMISSIONS
      // ------------------------------------------------------

      const pendingMap = new Map();

      for (
        const submission of pendingSubmissions
      ) {
        const studentId =
          String(submission.user_id);

        if (!pendingMap.has(studentId)) {
          pendingMap.set(
            studentId,
            []
          );
        }

        pendingMap
          .get(studentId)
          .push({
            id: submission.id,

            submission_id:
              submission.submission_id,

            title_slug:
              submission.title_slug,

            difficulty:
              submission.difficulty,

            submitted_at:
              submission.submitted_at,

            created_at:
              submission.created_at,

            flag_reason:
              submission.flag_reason,

            review_status:
              submission.review_status,

            status:
              submission.status,
          });
      }

      // ------------------------------------------------------
      // STEP 10: BUILD REVIEW CARDS
      // ------------------------------------------------------

      const reviews = [];

      for (
        const studentId of pendingStudentIds
      ) {
        const key = String(studentId);

        const submissions =
          pendingMap.get(key) || [];

        if (submissions.length === 0) {
          continue;
        }

        const profile =
          profileMap.get(key) || {};

        const leaderboard =
          leaderboardMap.get(key) || {};

        const assignment =
          assignmentMap.get(key) || {};

        reviews.push({
          student_user_id:
            studentId,

          name:
            profile.name ||
            "Unknown Student",

          avatar_url:
            profile.avatar_url ||
            null,

          squad_id:
            assignment.squad_id ??
            profile.squad_id ??
            null,

          assigned_at:
            assignment.assigned_at ??
            null,

          leetcode_username:
            leaderboard.leetcode_username ||
            profile.leetcode ||
            "unknown",

          easy_solved:
            Number(
              leaderboard.easy_solved
            ) || 0,

          medium_solved:
            Number(
              leaderboard.medium_solved
            ) || 0,

          hard_solved:
            Number(
              leaderboard.hard_solved
            ) || 0,

          total_solved:
            Number(
              leaderboard.total_solved
            ) || 0,

          ranking:
            leaderboard.ranking !== null &&
            leaderboard.ranking !== undefined
              ? Number(
                  leaderboard.ranking
                )
              : null,

          score:
            Number(
              leaderboard.score
            ) || 0,

          is_suspended:
            Boolean(
              leaderboard.is_suspended
            ),

          suspension_reason:
            leaderboard.suspension_reason ||
            null,

          pending_review_count:
            submissions.length,

          pending_submissions:
            submissions,
        });
      }

      // ------------------------------------------------------
      // SORT
      // ------------------------------------------------------

      reviews.sort(
        (a, b) =>
          b.pending_review_count -
          a.pending_review_count
      );

      console.log(
        "[MENTOR REVIEW] Review cards created:",
        reviews.length
      );

      console.log(
        "================================================"
      );

      return res.status(200).json({
        success: true,
        count: reviews.length,
        reviews,
      });
    } catch (error) {
      console.error(
        "[MENTOR REVIEW] Queue error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Internal server error",
      });
    }
  }
);

// ============================================================
// APPROVE MENTOR REVIEW
//
// PATCH /leetcode-review/:studentUserId/approve
// ============================================================

router.patch(
  "/leetcode-review/:studentUserId/approve",
  reviewLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const {
        studentUserId,
      } = req.params;

      const mentorUserId =
        req.user.id;

      const db =
        req.adminSupabase;

      console.log(
        "[MENTOR REVIEW] Approving:",
        {
          mentorUserId,
          studentUserId,
        }
      );

      // ------------------------------------------------------
      // VERIFY MENTOR ACCESS
      // ------------------------------------------------------

      const assignment =
        await verifyMentorCanReviewStudent(
          db,
          mentorUserId,
          studentUserId
        );

      if (!assignment) {
        return res.status(403).json({
          success: false,
          error:
            "You are not authorized to review this student",
        });
      }

      // ------------------------------------------------------
      // APPROVE ALL PENDING SUBMISSIONS
      // ------------------------------------------------------

      const {
        data: updated,
        error: updateError,
      } = await db
        .from("leetcode_submissions")
        .update({
          review_status: "approved",
          status: "APPROVED",
          flag_reason: null,
        })
        .eq("user_id", studentUserId)
        .eq("review_status", "pending")
        .select();

      if (updateError) {
        console.error(
          "[MENTOR REVIEW] Approve update error:",
          updateError
        );

        return res.status(400).json({
          success: false,
          error: updateError.message,
        });
      }

      if (
        !updated ||
        updated.length === 0
      ) {
        return res.status(404).json({
          success: false,
          error:
            "No pending reviews found",
        });
      }

      // ------------------------------------------------------
      // UPDATE LEADERBOARD STATUS
      // ------------------------------------------------------

      const reviewStatus =
        await updateStudentReviewStatus(
          db,
          studentUserId
        );

      return res.status(200).json({
        success: true,

        message:
          "Review approved successfully",

        student_user_id:
          studentUserId,

        approved_count:
          updated.length,

        remaining_pending:
          reviewStatus.hasPendingReviews,

        is_suspended:
          reviewStatus.isSuspended,
      });
    } catch (error) {
      console.error(
        "[MENTOR REVIEW] Approve error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Internal server error",
      });
    }
  }
);

// ============================================================
// REJECT MENTOR REVIEW
//
// PATCH /leetcode-review/:studentUserId/reject
// ============================================================

router.patch(
  "/leetcode-review/:studentUserId/reject",
  reviewLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const {
        studentUserId,
      } = req.params;

      const mentorUserId =
        req.user.id;

      const db =
        req.adminSupabase;

      console.log(
        "[MENTOR REVIEW] Rejecting:",
        {
          mentorUserId,
          studentUserId,
        }
      );

      // ------------------------------------------------------
      // VERIFY MENTOR ACCESS
      // ------------------------------------------------------

      const assignment =
        await verifyMentorCanReviewStudent(
          db,
          mentorUserId,
          studentUserId
        );

      if (!assignment) {
        return res.status(403).json({
          success: false,
          error:
            "You are not authorized to review this student",
        });
      }

      // ------------------------------------------------------
      // REJECT ALL PENDING SUBMISSIONS
      // ------------------------------------------------------

      const {
        data: updated,
        error: updateError,
      } = await db
        .from("leetcode_submissions")
        .update({
          review_status: "rejected",
          status: "REJECTED",
        })
        .eq("user_id", studentUserId)
        .eq("review_status", "pending")
        .select();

      if (updateError) {
        console.error(
          "[MENTOR REVIEW] Reject update error:",
          updateError
        );

        return res.status(400).json({
          success: false,
          error: updateError.message,
        });
      }

      if (
        !updated ||
        updated.length === 0
      ) {
        return res.status(404).json({
          success: false,
          error:
            "No pending reviews found",
        });
      }

      // ------------------------------------------------------
      // UPDATE LEADERBOARD STATUS
      // ------------------------------------------------------

      const reviewStatus =
        await updateStudentReviewStatus(
          db,
          studentUserId
        );

      return res.status(200).json({
        success: true,

        message:
          "Review rejected successfully",

        student_user_id:
          studentUserId,

        rejected_count:
          updated.length,

        is_suspended:
          reviewStatus.isSuspended,

        suspension_reason:
          reviewStatus.suspensionReason,
      });
    } catch (error) {
      console.error(
        "[MENTOR REVIEW] Reject error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Internal server error",
      });
    }
  }
);

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default router;