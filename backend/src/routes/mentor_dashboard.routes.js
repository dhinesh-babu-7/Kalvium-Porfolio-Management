import express from "express";
import rateLimit from "express-rate-limit";
import { createAuthedSupabaseClient, supabase } from "../config/supabase.js";

const router = express.Router();

const saveSquadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// HELPER: FILTER OUT SUSPENDED STUDENTS
// ==========================================
const filterSuspendedStudents = (students) => {
  return students.filter((student) => !student.is_suspended);
};

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token using imported supabase client
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.user = user;
    // Attach authed client so queries run with the user's RLS context
    req.authedSupabase = createAuthedSupabaseClient(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// ==========================================
// HELPER: NORMALIZE STUDENT ACTIVITY FIELDS
// ==========================================
const normalizeStudentActivity = (profile = {}) => {
  const rawActive =
    profile.is_leetcode_active ??
    profile.leetcode_active ??
    profile.is_active ??
    profile.active;

  const rawLastSolved =
    profile.last_solved_at ??
    profile.leetcode_last_solved_at ??
    profile.last_solved ??
    profile.last_active_at ??
    profile.updated_at;

  const rawTotalSolved =
    profile.total_solved ??
    profile.totalSolved ??
    profile.leetcode_total_solved ??
    profile.solved_count ??
    0;

  const totalSolved = Number(rawTotalSolved) || 0;
  const hasSolvedProblems = totalSolved > 0;
  const validLastSolved = hasSolvedProblems ? rawLastSolved || null : null;

  let isActive = false;
  if (hasSolvedProblems && validLastSolved) {
    const solvedDate = new Date(validLastSolved);
    if (!isNaN(solvedDate.getTime())) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      isActive = solvedDate.getTime() >= sevenDaysAgo;
    }
  }

  // If the raw active flag is true but the student has zero solved problems,
  // it must still be treated as inactive.
  if (!hasSolvedProblems) {
    isActive = false;
  }

  return {
    ...profile,
    id: profile.user_id || profile.id,
    student_user_id: profile.user_id || profile.student_user_id || profile.id,
    name: profile.name || "Unknown",
    email:
      profile.kalvium_email ||
      profile.personal_email ||
      profile.email ||
      "No email",
    avatar_url: profile.avatar_url || null,
    is_leetcode_active: isActive,
    total_solved: totalSolved,
    last_solved_at: validLastSolved,
    leetcode:
      profile.leetcode ||
      profile.leetcode_username ||
      profile.leetcode_handle ||
      null,
    github:
      profile.github ||
      profile.github_username ||
      profile.github_handle ||
      null,
    linkedin: profile.linkedin || profile.linkedin_url || null,
    is_suspended: profile.is_suspended || false,
    suspension_reason: profile.suspension_reason || null,
  };
};

// Helper: Build a lookup map from leetcode_leaderboard data
const createLeaderboardMap = (leaderboardRows = []) => {
  const map = new Map();
  leaderboardRows.forEach((row) => {
    if (row.user_id) map.set(String(row.user_id), row);
    if (row.profile_id) map.set(String(row.profile_id), row);
  });
  return map;
};

// ==========================================
// SQUAD MANAGEMENT ROUTES (mentor_squads & profiles)
// ==========================================

// NEW: GET ALL DISTINCT SQUADS FROM PROFILES TABLE FOR OVERVIEW
router.get("/getsquadsOverview", requireAuth, async (req, res) => {
  try {
    const db = req.authedSupabase;

    const { data, error } = await db
      .from("profiles")
      .select("squad_id")
      .not("squad_id", "is", null);

    if (error) {
      console.error("Fetch Squads Overview Error:", error);
      return res.status(400).json({ error: error.message });
    }

    // Extract distinct non-null squad IDs and sort them
    const uniqueSquads = [...new Set(
      (data || [])
        .map((item) => item.squad_id)
        .filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
    )].sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b));
    });

    return res.status(200).json({
      success: true,
      count: uniqueSquads.length,
      squads: uniqueSquads,
    });
  } catch (error) {
    console.error("Server Error in getsquadsOverview:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/getsquads", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const db = req.authedSupabase;

    const { data, error } = await db
      .from("mentor_squads")
      .select("squad_id")
      .eq("mentor_user_id", mentorUserId);

    if (error) {
      console.error("Fetch Squads Error:", error);
      return res.status(400).json({ error: error.message });
    }

    const squads = data ? data.map((item) => item.squad_id) : [];

    return res.status(200).json({
      success: true,
      count: squads.length,
      squads,
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/savesquad", saveSquadLimiter, requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const { squads } = req.body;

    if (!squads) {
      return res.status(400).json({ error: "Squads field is required" });
    }

    const squadList = Array.isArray(squads) ? squads : [squads];
    const db = req.authedSupabase;

    const { error: deleteError } = await db
      .from("mentor_squads")
      .delete()
      .eq("mentor_user_id", mentorUserId);

    if (deleteError) {
      console.error("Delete Error:", deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    if (squadList.length > 0) {
      const recordsToInsert = squadList.map((squadId) => ({
        mentor_user_id: mentorUserId,
        squad_id: Number(squadId),
      }));

      const { data, error: insertError } = await db
        .from("mentor_squads")
        .insert(recordsToInsert)
        .select();

      if (insertError) {
        console.error("Insert Error:", insertError);
        return res.status(400).json({ error: insertError.message });
      }

      return res
        .status(200)
        .json({ success: true, message: "Squads saved successfully", data });
    }

    return res.status(200).json({
      success: true,
      message: "All squad assignments cleared",
      data: [],
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/students", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const db = req.authedSupabase;
    const requestedSquadId = req.query.squad_id;

    const { data: mentorSquads, error: squadError } = await db
      .from("mentor_squads")
      .select("squad_id")
      .eq("mentor_user_id", mentorUserId);

    if (squadError) {
      console.error("Fetch Mentor Squads Error:", squadError);
      return res.status(400).json({ error: squadError.message });
    }

    const assignedSquadIds = mentorSquads
      ? mentorSquads.map((s) => String(s.squad_id))
      : [];

    if (assignedSquadIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, students: [] });
    }

    let query = db.from("profiles").select("*");

    if (requestedSquadId) {
      const requestedStr = String(requestedSquadId);
      if (!assignedSquadIds.includes(requestedStr)) {
        return res
          .status(403)
          .json({ error: "Forbidden: You are not assigned to this squad" });
      }
      query = query.eq("squad_id", requestedStr);
    } else {
      query = query.in("squad_id", assignedSquadIds);
    }

    const { data: students, error: studentError } = await query;

    if (studentError) {
      console.error("Fetch Students Error:", studentError);
      return res.status(400).json({ error: studentError.message });
    }

    // Fetch matching LeetCode activity stats from leetcode_leaderboard
    const studentUserIds = students
      ? students.map((s) => s.user_id || s.id).filter(Boolean)
      : [];
    const { data: leaderboardData } = await db
      .from("leetcode_leaderboard")
      .select("*")
      .in("user_id", studentUserIds);

    const leaderboardMap = createLeaderboardMap(leaderboardData);

    // Merge profile info with leaderboard stats and normalize
    const mappedStudents = students
      ? students.map((s) => {
          const stats =
            leaderboardMap.get(String(s.user_id)) ||
            leaderboardMap.get(String(s.id)) ||
            {};
          return normalizeStudentActivity({ ...s, ...stats });
        })
      : [];

    return res.status(200).json({
      success: true,
      count: mappedStudents.length,
      students: mappedStudents,
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ==========================================
// INDIVIDUAL STUDENT ROUTES (squad_students)
// ==========================================

router.get("/assigned-students", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const db = req.authedSupabase;

    // Step 1: Fetch assignments directly
    const { data: assignments, error: assignError } = await db
      .from("squad_students")
      .select("squad_id, student_user_id, assigned_at")
      .eq("mentor_user_id", mentorUserId);

    if (assignError) {
      console.error("Fetch Assigned Students Error:", assignError);
      return res.status(400).json({ error: assignError.message });
    }

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({ success: true, count: 0, students: [] });
    }

    // Step 2: Extract User IDs and fetch profiles
    const studentIds = assignments.map((a) => a.student_user_id);

    const { data: profiles, error: profileError } = await db
      .from("profiles")
      .select("*")
      .in("user_id", studentIds);

    if (profileError) {
      console.error("Fetch Profiles Error:", profileError);
      return res.status(400).json({ error: profileError.message });
    }

    // Step 3: Fetch activity stats from leetcode_leaderboard
    const { data: leaderboardData } = await db
      .from("leetcode_leaderboard")
      .select("*")
      .in("user_id", studentIds);

    const leaderboardMap = createLeaderboardMap(leaderboardData);

    // Step 4: Merge profiles + leaderboard stats and normalize
    const assignedStudents = assignments.map((assignment) => {
      const profile =
        profiles?.find(
          (p) => String(p.user_id) === String(assignment.student_user_id)
        ) || {};
      const stats =
        leaderboardMap.get(String(assignment.student_user_id)) ||
        leaderboardMap.get(String(profile.id)) ||
        {};

      const mergedData = { ...profile, ...stats };
      const normalized = normalizeStudentActivity(mergedData);

      return {
        ...normalized,
        student_user_id: assignment.student_user_id,
        squad_id: assignment.squad_id || profile.squad_id,
        assigned_at: assignment.assigned_at,
      };
    });

    return res.status(200).json({
      success: true,
      count: assignedStudents.length,
      students: assignedStudents,
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/student-stats/:studentUserId", requireAuth, async (req, res) => {
  try {
    const { studentUserId } = req.params;
    const db = req.authedSupabase;

    const [profileRes, statsRes] = await Promise.all([
      db.from("profiles").select("*").eq("user_id", studentUserId).single(),
      db
        .from("leetcode_leaderboard")
        .select("*")
        .eq("user_id", studentUserId)
        .maybeSingle(),
    ]);

    if (profileRes.error || !profileRes.data) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const mergedData = { ...profileRes.data, ...(statsRes.data || {}) };
    const normalized = normalizeStudentActivity(mergedData);

    return res.status(200).json({ success: true, student: normalized });
  } catch (error) {
    console.error("Fetch Student Stats Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/assign-student", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const { student_user_id, squad_id } = req.body;
    const db = req.authedSupabase;

    if (!student_user_id) {
      return res.status(400).json({ error: "student_user_id is required" });
    }

    const { data, error } = await db
      .from("squad_students")
      .insert([
        {
          mentor_user_id: mentorUserId,
          student_user_id: student_user_id,
          squad_id: squad_id ? Number(squad_id) : null,
        },
      ])
      .select();

    if (error) {
      console.error("Assign Student Error:", error);
      return res.status(400).json({ error: error.message });
    }

    return res
      .status(200)
      .json({ success: true, message: "Student assigned successfully", data });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/unassign-student", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const { student_user_id } = req.body;
    const db = req.authedSupabase;

    if (!student_user_id) {
      return res.status(400).json({ error: "student_user_id is required" });
    }

    const { error } = await db.from("squad_students").delete().match({
      mentor_user_id: mentorUserId,
      student_user_id: student_user_id,
    });

    if (error) {
      console.error("Unassign Student Error:", error);
      return res.status(400).json({ error: error.message });
    }

    return res
      .status(200)
      .json({ success: true, message: "Student unassigned successfully" });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ==========================================
// MENTOR REVIEW QUEUE
// ==========================================

router.get("/leetcode-review/queue", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const db = req.authedSupabase;

    const { data: assignments, error: assignmentError } = await db
      .from("squad_students")
      .select("student_user_id, squad_id, assigned_at")
      .eq("mentor_user_id", mentorUserId);

    if (assignmentError) {
      console.error("Review Queue Assignment Error:", assignmentError);

      return res.status(400).json({
        error: assignmentError.message,
      });
    }

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        reviews: [],
      });
    }

    const studentIds = assignments
      .map((item) => item.student_user_id)
      .filter(Boolean);

    const { data: pendingSubmissions, error: submissionError } = await db
      .from("leetcode_submissions")
      .select(
        `
                id,
                user_id,
                leetcode_username,
                submission_id,
                title_slug,
                difficulty,
                submitted_at,
                flag_reason,
                review_status,
                status
            `
      )
      .eq("review_status", "pending")
      .in("user_id", studentIds)
      .order("submitted_at", {
        ascending: true,
      });

    if (submissionError) {
      console.error("Pending Submission Error:", submissionError);

      return res.status(400).json({
        error: submissionError.message,
      });
    }

    if (!pendingSubmissions || pendingSubmissions.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        reviews: [],
      });
    }

    const { data: profiles, error: profileError } = await db
      .from("profiles")
      .select(
        `
                user_id,
                name,
                avatar_url,
                squad_id,
                leetcode
            `
      )
      .in("user_id", studentIds);

    if (profileError) {
      console.error("Review Queue Profile Error:", profileError);

      return res.status(400).json({
        error: profileError.message,
      });
    }

    const { data: leaderboardData, error: leaderboardError } = await db
      .from("leetcode_leaderboard")
      .select(
        `
    id,
    user_id,
    profile_id,
    leetcode_username,
    easy_solved,
    medium_solved,
    hard_solved,
    total_solved,
    score
`
      )
      .in("user_id", studentIds);

    if (leaderboardError) {
      console.error("Review Queue Leaderboard Error:", leaderboardError);

      return res.status(400).json({
        error: leaderboardError.message,
      });
    }

    const profileMap = new Map();

    (profiles || []).forEach((profile) => {
      profileMap.set(String(profile.user_id), profile);
    });

    const leaderboardMap = new Map();

    (leaderboardData || []).forEach((row) => {
      leaderboardMap.set(String(row.user_id), row);
    });

    const reviews = [];

    for (const studentId of studentIds) {
      const studentPendingSubmissions = pendingSubmissions.filter(
        (submission) => String(submission.user_id) === String(studentId)
      );

      if (studentPendingSubmissions.length === 0) {
        continue;
      }

      const profile = profileMap.get(String(studentId)) || {};
      const leaderboard = leaderboardMap.get(String(studentId)) || {};

      reviews.push({
        student_user_id: studentId,
        name: profile.name || "Unknown Student",
        avatar_url: profile.avatar_url || null,
        squad_id: profile.squad_id || null,
        leetcode_username:
          leaderboard.leetcode_username ||
          studentPendingSubmissions[0]?.leetcode_username ||
          profile.leetcode ||
          "unknown",
        easy_solved: leaderboard.easy_solved || 0,
        medium_solved: leaderboard.medium_solved || 0,
        hard_solved: leaderboard.hard_solved || 0,
        total_solved: leaderboard.total_solved || 0,
        score: leaderboard.score || 0,
        pending_review_count: studentPendingSubmissions.length,
        pending_submissions: studentPendingSubmissions,
      });
    }

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Mentor Review Queue Error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// ==========================================
// APPROVE MENTOR REVIEW
// ==========================================

router.patch(
  "/leetcode-review/:studentUserId/approve",
  requireAuth,
  async (req, res) => {
    try {
      const { studentUserId } = req.params;
      const db = req.authedSupabase;

      const { data: pending, error: pendingError } = await db
        .from("leetcode_submissions")
        .select("id")
        .eq("user_id", studentUserId)
        .eq("review_status", "pending");

      if (pendingError) {
        return res.status(400).json({
          error: pendingError.message,
        });
      }

      if (!pending || pending.length === 0) {
        return res.status(404).json({
          error: "No pending review found for this student",
        });
      }

      const { data, error } = await db
        .from("leetcode_submissions")
        .update({
          review_status: "approved",
          status: "APPROVED",
          flag_reason: null,
        })
        .eq("user_id", studentUserId)
        .eq("review_status", "pending")
        .select();

      if (error) {
        console.error("Approve Review Error:", error);

        return res.status(400).json({
          error: error.message,
        });
      }

      const { data: stillPending } = await db
        .from("leetcode_submissions")
        .select("id")
        .eq("user_id", studentUserId)
        .eq("review_status", "pending")
        .limit(1);

      const hasPendingReviews = stillPending && stillPending.length > 0;

      await db
        .from("leetcode_leaderboard")
        .update({
          is_suspended: hasPendingReviews,
          suspension_reason: hasPendingReviews
            ? "Pending mentor review for suspicious submission patterns"
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", studentUserId);

      console.log(
        `[APPROVAL] User ${studentUserId} | Suspension lifted - ready for leaderboard`
      );

      return res.status(200).json({
        success: true,
        message: "Review approved successfully",
        updated: data,
      });
    } catch (error) {
      console.error("Approve Review Server Error:", error);

      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

// ==========================================
// REJECT MENTOR REVIEW
// ==========================================

router.patch(
  "/leetcode-review/:studentUserId/reject",
  requireAuth,
  async (req, res) => {
    try {
      const { studentUserId } = req.params;
      const db = req.authedSupabase;

      const { data: pending, error: pendingError } = await db
        .from("leetcode_submissions")
        .select("id")
        .eq("user_id", studentUserId)
        .eq("review_status", "pending");

      if (pendingError) {
        return res.status(400).json({
          error: pendingError.message,
        });
      }

      if (!pending || pending.length === 0) {
        return res.status(404).json({
          error: "No pending review found for this student",
        });
      }

      const { data, error } = await db
        .from("leetcode_submissions")
        .update({
          review_status: "rejected",
          status: "REJECTED",
        })
        .eq("user_id", studentUserId)
        .eq("review_status", "pending")
        .select();

      if (error) {
        console.error("Reject Review Error:", error);

        return res.status(400).json({
          error: error.message,
        });
      }

      await db
        .from("leetcode_leaderboard")
        .update({
          is_suspended: true,
          suspension_reason:
            "Rejected for suspicious submission patterns - Academic integrity violation",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", studentUserId);

      console.log(
        `[REJECTION] User ${studentUserId} | Permanently suspended for academic integrity violation`
      );

      return res.status(200).json({
        success: true,
        message:
          "Suspicious submissions rejected - Student suspended from leaderboard",
        updated: data,
      });
    } catch (error) {
      console.error("Reject Review Server Error:", error);

      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

export default router;