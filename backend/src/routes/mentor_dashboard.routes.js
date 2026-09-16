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

// ==========================================
// LEETCODE SESSION ROUTES
// ==========================================

// Session live-refresh limiter - one real-time snapshot per 30 seconds per mentor.
// requireAuth is mounted before this so req.user is always present, which lets us
// key on the mentor id. Note: referencing req.ip here would make express-rate-limit
// v8 throw ERR_ERL_KEY_GEN_IPV6 at import time, so the key is mentor-only.
const sessionRateLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 2,
  keyGenerator: (req) => String(req.user?.id || "anonymous"),
  message: { error: "Please wait 30 seconds before requesting another update" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// REAL-TIME LEETCODE ACTIVITY HELPERS
// ==========================================
//
// The leetcode_leaderboard table is refreshed by the daily cron, so it can be
// up to 24h stale. During a live mentor session we query LeetCode directly and
// diff the snapshot against the baseline captured when the session started.

const LEETCODE_LIVE_GRAPHQL_URL = "https://leetcode.com/graphql";
const LIVE_STATS_CACHE_TTL_MS = 25 * 1000;
const LEETCODE_FETCH_TIMEOUT_MS = 8000;

// handle -> { data, fetchedAt }: stops LeetCode being hammered when several
// mentors poll inside the same 30 second window
const liveStatsCache = new Map();

// sessionId -> { startedAt, users: { [userId]: { totalSolved, submissionIds } } }
// Baseline captured at session start; only meaningful while the session lives,
// so it is kept in memory rather than in the database.
const sessionBaselines = new Map();

// Accepts either a bare handle or a full profile URL
const extractLeetcodeHandle = (value) => {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  if (raw.includes("leetcode.com")) {
    const parts = raw.split("/").filter(Boolean);
    const candidate = parts[parts.length - 1];
    if (!candidate || candidate === "u") return null;
    return candidate;
  }

  return raw;
};

const LIVE_STATS_QUERY_FULL = `
  query getLiveUserStats($username: String!) {
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    recentAcSubmissionList(username: $username, limit: 20) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

const LIVE_STATS_QUERY_FAST = `
  query getLiveUserStatsFast($username: String!) {
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

// Pulls stats straight from LeetCode so a session sees live data instead of the
// once-a-day values stored in leetcode_leaderboard. Two shapes are supported:
// "full" (stats + recent submissions, used on manual refresh / updates) and
// "fast" (stats only, used when starting a session so it returns quickly).
async function fetchLiveLeetcodeStats(username, mode = "full") {
  const handle = extractLeetcodeHandle(username);
  if (!handle) return null;

  const cached = liveStatsCache.get(handle);
  if (cached && Date.now() - cached.fetchedAt < LIVE_STATS_CACHE_TTL_MS) {
    // A cached FULL snapshot satisfies both modes. A cached FAST snapshot is
    // only good enough for another fast request - never serve it as full or
    // the session would lose its recent-submissions baseline.
    if (mode === "fast" || cached.full) {
      return cached.data;
    }
  }

  if (typeof fetch !== "function") {
    console.warn("[LIVE LEETCODE] global fetch unavailable - Node 18+ required");
    return cached?.data || null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LEETCODE_FETCH_TIMEOUT_MS);

  try {
    const isFast = mode === "fast";

    const response = await fetch(LEETCODE_LIVE_GRAPHQL_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        query: isFast ? LIVE_STATS_QUERY_FAST : LIVE_STATS_QUERY_FULL,
        variables: { username: handle },
      }),
    });

    if (!response.ok) {
      console.warn(`[LIVE LEETCODE] ${handle} responded with HTTP ${response.status}`);
      return cached?.data || null;
    }

    const result = await response.json();
    const matchedUser = result?.data?.matchedUser;

    if (!matchedUser) {
      console.warn(`[LIVE LEETCODE] ${handle} was not found`);
      return cached?.data || null;
    }

    const submitStats = matchedUser.submitStatsGlobal?.acSubmissionNum || [];

    // Fast mode fetches stats only; keep any previously-cached recent
    // submissions so the session baseline still has ids to diff against.
    const previousSubs = cached?.data?.recentSubmissions || [];

    const data = {
      username: matchedUser.username,
      totalSolved: submitStats.find((item) => item.difficulty === "All")?.count || 0,
      easySolved: submitStats.find((item) => item.difficulty === "Easy")?.count || 0,
      mediumSolved: submitStats.find((item) => item.difficulty === "Medium")?.count || 0,
      hardSolved: submitStats.find((item) => item.difficulty === "Hard")?.count || 0,
      recentSubmissions: isFast
        ? previousSubs
        : (result?.data?.recentAcSubmissionList || []).map((sub) => ({
          id: String(sub.id),
          title: sub.title,
          titleSlug: sub.titleSlug,
          timestamp: Number(sub.timestamp) || 0,
        })),
    };

    liveStatsCache.set(handle, { data, fetchedAt: Date.now(), full: !isFast });
    return data;
  } catch (err) {
    console.warn(`[LIVE LEETCODE] Failed for ${handle}:`, err?.message || err);
    return cached?.data || null;
  } finally {
    clearTimeout(timeout);
  }
}

// Students assigned to the given squads, with their LeetCode handle resolved
async function getSessionStudents(db, squadIds = []) {
  if (!Array.isArray(squadIds) || squadIds.length === 0) return [];

  const { data: squadStudents, error: squadError } = await db
    .from("squad_students")
    .select("student_user_id")
    .in("squad_id", squadIds);

  if (squadError) throw squadError;
  if (!squadStudents || squadStudents.length === 0) return [];

  const studentIds = [...new Set(squadStudents.map((row) => row.student_user_id))];

  const [profileRes, leaderboardRes] = await Promise.all([
    db.from("profiles").select("*").in("user_id", studentIds),
    db.from("leetcode_leaderboard").select("*").in("user_id", studentIds),
  ]);

  const leaderboardMap = {};
  (leaderboardRes.data || []).forEach((row) => {
    leaderboardMap[row.user_id] = row;
  });

  return (profileRes.data || []).map((profile) => {
    const leaderboard = leaderboardMap[profile.user_id] || null;

    return {
      user_id: profile.user_id,
      name: profile.name || "Unnamed Student",
      avatar_url: profile.avatar_url || null,
      kalvium_email: profile.kalvium_email || profile.kalviumEmail || null,
      squad_id: profile.squad_id || null,
      leetcode_username: extractLeetcodeHandle(
        profile.leetcode || profile.leetcode_url || leaderboard?.leetcode_username
      ),
      db_total_solved: Number(leaderboard?.total_solved) || 0,
      db_last_solved_at: leaderboard?.last_solved_at || null,
      is_suspended: Boolean(leaderboard?.is_suspended),
    };
  });
}

// Adds real-time LeetCode data to each student (parallel batches with a small
// concurrency limit, so starting a session does not take N sequential round
// trips to LeetCode)
const LIVE_STATS_CONCURRENCY = 8;

async function attachLiveStats(students = [], mode = "full") {
  const enriched = new Array(students.length);

  const worker = async (queue) => {
    while (queue.length > 0) {
      const index = queue.pop();
      const student = students[index];

      if (!student.leetcode_username) {
        enriched[index] = {
          ...student,
          has_leetcode: false,
          live_total_solved: null,
          live_easy_solved: 0,
          live_medium_solved: 0,
          live_hard_solved: 0,
          recent_submissions: [],
          last_activity: student.db_last_solved_at,
          fetch_failed: false,
        };
        continue;
      }

      const live = await fetchLiveLeetcodeStats(student.leetcode_username, mode);
      const latestSubmission = live?.recentSubmissions?.[0] || null;

      enriched[index] = {
        ...student,
        has_leetcode: true,
        live_total_solved: live ? live.totalSolved : null,
        live_easy_solved: live?.easySolved || 0,
        live_medium_solved: live?.mediumSolved || 0,
        live_hard_solved: live?.hardSolved || 0,
        recent_submissions: live?.recentSubmissions || [],
        last_activity: latestSubmission?.timestamp
          ? new Date(latestSubmission.timestamp * 1000).toISOString()
          : student.db_last_solved_at,
        fetch_failed: !live,
      };
    }
  };

  const queue = students.map((_, index) => index);
  const workerCount = Math.min(LIVE_STATS_CONCURRENCY, students.length);
  const workers = Array.from({ length: workerCount }, () => worker(queue));
  await Promise.all(workers);

  return enriched;
}

// GET /mentor/dashboard/leetcode-session
// Returns the mentor's active session together with a live LeetCode snapshot
router.get("/leetcode-session", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const db = req.authedSupabase;

    const { data: activeSession, error: sessionError } = await db
      .from("mentor_leetcode_sessions")
      .select("*")
      .eq("mentor_id", mentorUserId)
      .eq("status", "active")
      .maybeSingle();

    if (sessionError) {
      return res.status(400).json({ error: sessionError.message });
    }

    if (!activeSession) {
      return res.status(200).json({
        active: false,
        session: null,
        students: [],
        summary: null,
        lastUpdated: null
      });
    }

    return res.status(200).json(await buildSessionPayload(db, activeSession));
  } catch (err) {
    console.error("Session status error:", err);
    return res.status(500).json({ error: "Failed to get session status" });
  }
});

// POST /mentor/dashboard/leetcode-session/start
router.post("/leetcode-session/start", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const { squad_ids } = req.body;
    const db = req.authedSupabase;

    if (!squad_ids || !Array.isArray(squad_ids) || squad_ids.length === 0) {
      return res.status(400).json({ error: "Squad IDs are required" });
    }

    // A mentor may only monitor squads they actually own. Without this check a
    // crafted request could watch another mentor's squad.
    const { data: ownedSquads, error: ownedSquadsError } = await db
      .from("mentor_squads")
      .select("squad_id")
      .eq("mentor_user_id", mentorUserId);

    if (ownedSquadsError) {
      console.error("Session squad ownership lookup failed:", ownedSquadsError);
      return res.status(400).json({ error: ownedSquadsError.message });
    }

    const ownedSquadIds = new Set(
      (ownedSquads || []).map((row) => String(row.squad_id))
    );

    const requestedSquadIds = squad_ids.map((id) => String(id));

    const unownedSquadIds = requestedSquadIds.filter(
      (id) => !ownedSquadIds.has(id)
    );

    if (unownedSquadIds.length > 0) {
      return res.status(403).json({
        error: "You can only monitor squads assigned to you",
        unownedSquadIds,
      });
    }

    // Only one live session per mentor - close any leftover active session
    const { data: existingSession, error: existingError } = await db
      .from("mentor_leetcode_sessions")
      .select("id")
      .eq("mentor_id", mentorUserId)
      .eq("status", "active")
      .maybeSingle();

    if (existingError) {
      return res.status(400).json({ error: existingError.message });
    }

    if (existingSession) {
      sessionBaselines.delete(String(existingSession.id));

      await db
        .from("mentor_leetcode_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        })
        .eq("id", existingSession.id);
    }

    const { data: newSession, error: createError } = await db
      .from("mentor_leetcode_sessions")
      .insert([{
        mentor_id: mentorUserId,
        squad_ids: squad_ids,
        status: "active",
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) {
      console.error("Session creation error:", createError);
      return res.status(500).json({ error: createError.message });
    }

    // Capture the live LeetCode baseline straight away, so "completed during
    // session" is measured from this exact moment onwards. Fast mode (stats
    // only, parallel) keeps session start snappy; recent submissions fill in
    // on the first 30s refresh.
    let payload = { active: false, session: newSession, students: [], summary: null };

    try {
      const baseStudents = await getSessionStudents(db, squad_ids);
      const initialStudents = await attachLiveStats(baseStudents, "fast");

      setSessionBaseline(newSession, initialStudents);

      payload = await buildSessionPayload(db, newSession, "fast");
    } catch (baselineError) {
      console.warn(
        "Session baseline capture failed:",
        baselineError?.message || baselineError
      );
    }

    return res.status(201).json({
      success: true,
      message: "Session started successfully",
      ...payload,
    });
  } catch (err) {
    console.error("Start session error:", err);
    return res.status(500).json({ error: "Failed to start session" });
  }
});

// POST /mentor/dashboard/leetcode-session/end
router.post("/leetcode-session/end", requireAuth, async (req, res) => {
  try {
    const mentorUserId = req.user.id;

    const db = req.authedSupabase;

    const { data: session, error: sessionError } = await db
      .from("mentor_leetcode_sessions")
      .select("id")
      .eq("mentor_id", mentorUserId)
      .eq("status", "active")
      .maybeSingle();

    if (sessionError) {
      return res.status(400).json({ error: sessionError.message });
    }

    if (!session) {
      return res.status(404).json({ error: "No active session found" });
    }

    const { error: updateError } = await db
      .from("mentor_leetcode_sessions")
      .update({ 
        status: "ended", 
        ended_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .eq("id", session.id);

    if (updateError) {
      console.error("Session end error:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Drop the in-memory baseline - it is only valid for the live session
    sessionBaselines.delete(String(session.id));

    return res.status(200).json({
      success: true,
      message: "Session ended successfully"
    });
  } catch (err) {
    console.error("End session error:", err);
    return res.status(500).json({ error: "Failed to end session" });
  }
});

// Snapshot used as the reference point for "did this student solve something
// during the session?"
function setSessionBaseline(session, students = []) {
  if (!session?.id) return;

  const users = {};
  students.forEach((student) => {
    users[student.user_id] = {
      totalSolved: student.live_total_solved ?? student.db_total_solved ?? 0,
      submissionIds: (student.recent_submissions || []).map((sub) => sub.id),
    };
  });

  sessionBaselines.set(String(session.id), {
    startedAt: session.started_at,
    users,
  });
}

// Compares the live snapshot against the baseline of the running session
function withSessionActivity(students = [], session) {
  const baseline = sessionBaselines.get(String(session?.id)) || null;
  const startedAtMs = session?.started_at ? new Date(session.started_at).getTime() : 0;

  return students.map((student) => {
    const base = baseline?.users?.[student.user_id] || null;
    const baseTotalSolved =
      base?.totalSolved ?? student.live_total_solved ?? student.db_total_solved ?? 0;

    const knownIds = new Set(base?.submissionIds || []);

    const newSubmissions = (student.recent_submissions || []).filter(
      (sub) => !knownIds.has(sub.id) && sub.timestamp * 1000 >= startedAtMs
    );

    const solvedDuringSession =
      student.live_total_solved == null
        ? 0
        : Math.max(student.live_total_solved - baseTotalSolved, 0);

    const completed = solvedDuringSession > 0 || newSubmissions.length > 0;

    return {
      ...student,
      baseline_available: Boolean(base),
      base_total_solved: baseTotalSolved,
      solved_during_session: solvedDuringSession,
      new_submissions: newSubmissions,
      new_submissions_count: newSubmissions.length,
      completed_during_session: completed,
      completed_today: completed,
      // Kept as an alias so existing UI code keeps working
      solved_today: solvedDuringSession,
    };
  });
}

// Payload a mentor sees while a session is active
function buildSessionSummary(students = []) {
  const completed = students.filter((student) => student.completed_during_session);
  const pending = students.filter((student) => !student.completed_during_session);

  const toSummaryEntry = (student) => ({
    user_id: student.user_id,
    name: student.name,
    avatar_url: student.avatar_url || null,
    kalvium_email: student.kalvium_email || null,
    squad_id: student.squad_id,
    leetcode_username: student.leetcode_username,
    has_leetcode: student.has_leetcode,
    total_solved: student.live_total_solved ?? student.db_total_solved ?? 0,
    base_total_solved: student.base_total_solved,
    solved_during_session: student.solved_during_session,
    new_submissions_count: student.new_submissions_count,
    new_submissions: student.new_submissions,
    last_activity: student.last_activity,
    fetch_failed: student.fetch_failed,
  });

  return {
    total: students.length,
    completed: completed.length,
    not_completed: pending.length,
    completionRate: students.length
      ? Math.round((completed.length / students.length) * 100)
      : 0,
    completedStudents: completed.map(toSummaryEntry),
    notCompletedStudents: pending.map(toSummaryEntry),
    // Aliases kept so the existing panel UI keeps working
    completedToday: completed.length,
    notCompletedToday: pending.length,
  };
}

// Shared builder for GET /leetcode-session and GET /leetcode-session/update.
// mode is "fast" on session start (stats only, returns quickly) and "full" on
// refresh/update (stats + recent submissions for the activity diff).
async function buildSessionPayload(db, session, mode = "full") {
  const baseStudents = await getSessionStudents(db, session.squad_ids || []);

  // A fresh session - or one restored after a server restart - has no baseline
  // yet, so capture one now and compare later updates against it.
  if (!sessionBaselines.has(String(session.id))) {
    const initialStudents = await attachLiveStats(baseStudents, mode);
    setSessionBaseline(session, initialStudents);

    const students = withSessionActivity(initialStudents, session);

    return {
      active: true,
      session,
      students,
      summary: buildSessionSummary(students),
      lastUpdated: new Date().toISOString(),
    };
  }

  const students = withSessionActivity(await attachLiveStats(baseStudents, mode), session);

  return {
    active: true,
    session,
    students,
    summary: buildSessionSummary(students),
    lastUpdated: new Date().toISOString(),
  };
}

// GET /mentor/dashboard/leetcode-session/update - Rate limited to 30s
// requireAuth runs first so the limiter can key on the mentor's own id
router.get("/leetcode-session/update", requireAuth, sessionRateLimiter, async (req, res) => {
  try {
    const mentorUserId = req.user.id;

    const db = req.authedSupabase;

    const { data: session, error: sessionError } = await db
      .from("mentor_leetcode_sessions")
      .select("*")
      .eq("mentor_id", mentorUserId)
      .eq("status", "active")
      .maybeSingle();

    if (sessionError) {
      return res.status(400).json({ error: sessionError.message });
    }

    if (!session) {
      return res.status(200).json({
        active: false,
        session: null,
        students: [],
        summary: null,
        lastUpdated: null
      });
    }

    // Heartbeat so stale sessions can be spotted
    await db
      .from("mentor_leetcode_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", session.id);

    // Live LeetCode snapshot diffed against the baseline captured at start
    return res.status(200).json(await buildSessionPayload(db, session));
  } catch (err) {
    console.error("Session update error:", err);
    return res.status(500).json({ error: "Failed to update session" });
  }
});

export default router;