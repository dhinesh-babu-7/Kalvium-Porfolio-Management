import express from "express";
import rateLimit from "express-rate-limit";
import { createAuthedSupabaseClient, supabase } from "../config/supabase.js";

const router = express.Router();

// ============================================================
// RATE LIMITERS
// ============================================================

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
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

const studentAssignmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many assignment requests. Please try again later.",
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
      console.error("[MENTOR AUTH ERROR]", authError);

      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    req.user = user;
    req.authedSupabase = createAuthedSupabaseClient(token);

    if (!supabaseAdmin) {
      console.error(
        "[MENTOR DASHBOARD] SUPABASE_SERVICE_KEY is missing."
      );

      return res.status(500).json({
        success: false,
        error: "Server database configuration is incomplete",
      });
    }

    req.adminSupabase = supabaseAdmin;

    return next();
  } catch (error) {
    console.error("[MENTOR AUTH EXCEPTION]", error);

    return res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

// ============================================================
// SQUAD MANAGEMENT
// ============================================================

// GET MENTOR SQUADS
router.get("/getsquads", requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.adminSupabase
      .from("mentor_squads")
      .select("squad_id")
      .eq("mentor_user_id", req.user.id);

    if (error) {
      console.error("[MENTOR SQUADS] Fetch error:", error);

      return res.status(400).json({
        success: false,
        error: error.message,
      });
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

// SAVE MENTOR SQUADS
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
          squads
            .map((squadId) => Number(squadId))
            .filter(Number.isInteger)
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
        console.error(
          "[MENTOR SQUADS] Delete error:",
          deleteError
        );

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
          }))
        )
        .select();

      if (insertError) {
        console.error(
          "[MENTOR SQUADS] Insert error:",
          insertError
        );

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
      console.error(
        "[MENTOR SQUADS] Save exception:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// ============================================================
// GET STUDENTS IN MENTOR'S SQUADS
// ============================================================

router.get("/students", requireAuth, async (req, res) => {
  try {
    const db = req.adminSupabase;

    const {
      data: mentorSquads,
      error: squadError,
    } = await db
      .from("mentor_squads")
      .select("squad_id")
      .eq("mentor_user_id", req.user.id);

    if (squadError) {
      return res.status(400).json({
        success: false,
        error: squadError.message,
      });
    }

    let squadIds = (mentorSquads || [])
      .map((item) => item.squad_id)
      .filter(
        (id) =>
          id !== null &&
          id !== undefined
      );

    const requestedSquadId = req.query.squad_id;

    if (requestedSquadId !== undefined) {
      const squadId = Number(requestedSquadId);

      if (
        !Number.isInteger(squadId) ||
        !squadIds.includes(squadId)
      ) {
        return res.status(403).json({
          success: false,
          error: "You are not assigned to this squad",
        });
      }

      squadIds = [squadId];
    }

    if (squadIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        students: [],
      });
    }

    const {
      data: profiles,
      error: profileError,
    } = await db
      .from("profiles")
      .select("*")
      .in("squad_id", squadIds);

    if (profileError) {
      return res.status(400).json({
        success: false,
        error: profileError.message,
      });
    }

    const studentIds = (profiles || [])
      .map((profile) => profile.user_id)
      .filter(Boolean);

    const {
      data: leaderboard,
      error: leaderboardError,
    } = studentIds.length
      ? await db
          .from("leetcode_leaderboard")
          .select("*")
          .in("user_id", studentIds)
      : {
          data: [],
          error: null,
        };

    if (leaderboardError) {
      return res.status(400).json({
        success: false,
        error: leaderboardError.message,
      });
    }

    const leaderboardMap = new Map(
      (leaderboard || []).map((row) => [
        String(row.user_id),
        row,
      ])
    );

    const students = (profiles || []).map((profile) => ({
      ...profile,

      ...(leaderboardMap.get(
        String(profile.user_id)
      ) || {}),

      id: profile.user_id || profile.id,

      student_user_id:
        profile.user_id || profile.id,
    }));

    return res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error(
      "[MENTOR STUDENTS] Fetch exception:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============================================================
// ASSIGN STUDENT
//
// POST /assign-student
//
// Supports:
// student_user_id
// studentUserId
// user_id
//
// squad_id is optional.
// If not supplied, student's profile squad_id is used.
// ============================================================

router.post(
  "/assign-student",
  studentAssignmentLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const db = req.adminSupabase;
      const mentorUserId = req.user.id;

      const {
        student_user_id,
        studentUserId,
        user_id,
        squad_id,
        squadId,
      } = req.body;

      const studentId =
        student_user_id ||
        studentUserId ||
        user_id;

      const rawSquadId =
        squad_id !== undefined
          ? squad_id
          : squadId;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: "student_user_id is required",
        });
      }

      const parsedSquadId =
        rawSquadId !== undefined &&
        rawSquadId !== null &&
        rawSquadId !== ""
          ? Number(rawSquadId)
          : null;

      if (
        parsedSquadId !== null &&
        !Number.isInteger(parsedSquadId)
      ) {
        return res.status(400).json({
          success: false,
          error: "squad_id must be a valid number",
        });
      }

      // Verify student exists.
      const {
        data: studentProfile,
        error: studentError,
      } = await db
        .from("profiles")
        .select("user_id, squad_id, name")
        .eq("user_id", studentId)
        .maybeSingle();

      if (studentError) {
        console.error(
          "[ASSIGN STUDENT] Student lookup error:",
          studentError
        );

        return res.status(400).json({
          success: false,
          error: studentError.message,
        });
      }

      if (!studentProfile) {
        return res.status(404).json({
          success: false,
          error: "Student not found",
        });
      }

      // Use provided squad_id.
      // Otherwise use student's profile squad_id.
      const finalSquadId =
        parsedSquadId ??
        studentProfile.squad_id ??
        null;

      if (finalSquadId === null) {
        return res.status(400).json({
          success: false,
          error: "Student does not have a valid squad",
        });
      }

      // Verify mentor owns this squad.
      const {
        data: mentorSquad,
        error: mentorSquadError,
      } = await db
        .from("mentor_squads")
        .select("squad_id")
        .eq("mentor_user_id", mentorUserId)
        .eq("squad_id", finalSquadId)
        .maybeSingle();

      if (mentorSquadError) {
        console.error(
          "[ASSIGN STUDENT] Squad check error:",
          mentorSquadError
        );

        return res.status(400).json({
          success: false,
          error: mentorSquadError.message,
        });
      }

      if (!mentorSquad) {
        return res.status(403).json({
          success: false,
          error:
            "You are not assigned to this squad. Please select one of your assigned squads.",
        });
      }

      // Check existing assignment for this mentor + student.
      const {
        data: existingAssignment,
        error: existingError,
      } = await db
        .from("squad_students")
        .select("*")
        .eq("mentor_user_id", mentorUserId)
        .eq("student_user_id", studentId)
        .maybeSingle();

      if (existingError) {
        console.error(
          "[ASSIGN STUDENT] Existing assignment error:",
          existingError
        );

        return res.status(400).json({
          success: false,
          error: existingError.message,
        });
      }

      // Student already assigned to this mentor.
      // Update squad instead of creating duplicate.
      if (existingAssignment) {
        const {
          data: updatedAssignment,
          error: updateError,
        } = await db
          .from("squad_students")
          .update({
            squad_id: finalSquadId,
            assigned_at: new Date().toISOString(),
          })
          .eq("mentor_user_id", mentorUserId)
          .eq("student_user_id", studentId)
          .select()
          .single();

        if (updateError) {
          console.error(
            "[ASSIGN STUDENT] Update error:",
            updateError
          );

          return res.status(400).json({
            success: false,
            error: updateError.message,
          });
        }

        return res.status(200).json({
          success: true,
          message:
            "Student assignment updated successfully",
          student: updatedAssignment,
        });
      }

      // Create assignment.
      const insertPayload = {
        mentor_user_id: mentorUserId,
        student_user_id: studentId,
        squad_id: finalSquadId,
      };

      const {
        data: assignment,
        error: assignError,
      } = await db
        .from("squad_students")
        .insert(insertPayload)
        .select()
        .single();

      if (assignError) {
        console.error(
          "[ASSIGN STUDENT] Insert error:",
          assignError
        );

        return res.status(400).json({
          success: false,
          error: assignError.message,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Student assigned successfully",
        student: assignment,
      });
    } catch (error) {
      console.error(
        "[ASSIGN STUDENT] Exception:",
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
// UNASSIGN STUDENT - POST VERSION
//
// POST /unassign-student
//
// Supports body:
// {
//   student_user_id: "UUID"
// }
//
// OR:
// {
//   studentUserId: "UUID"
// }
//
// OR:
// {
//   user_id: "UUID"
// }
// ============================================================

router.post(
  "/unassign-student",
  studentAssignmentLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const db = req.adminSupabase;
      const mentorUserId = req.user.id;

      const {
        student_user_id,
        studentUserId,
        user_id,
      } = req.body;

      const studentId =
        student_user_id ||
        studentUserId ||
        user_id;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: "student_user_id is required",
        });
      }

      const {
        data: existingAssignment,
        error: lookupError,
      } = await db
        .from("squad_students")
        .select("*")
        .eq("mentor_user_id", mentorUserId)
        .eq("student_user_id", studentId)
        .maybeSingle();

      if (lookupError) {
        console.error(
          "[UNASSIGN STUDENT] Lookup error:",
          lookupError
        );

        return res.status(400).json({
          success: false,
          error: lookupError.message,
        });
      }

      if (!existingAssignment) {
        return res.status(404).json({
          success: false,
          error: "This student is not assigned to you",
        });
      }

      const {
        data: deletedAssignment,
        error: deleteError,
      } = await db
        .from("squad_students")
        .delete()
        .eq("mentor_user_id", mentorUserId)
        .eq("student_user_id", studentId)
        .select();

      if (deleteError) {
        console.error(
          "[UNASSIGN STUDENT] Delete error:",
          deleteError
        );

        return res.status(400).json({
          success: false,
          error: deleteError.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Student unassigned successfully",
        student_user_id: studentId,
        deleted: deletedAssignment || [],
      });
    } catch (error) {
      console.error(
        "[UNASSIGN STUDENT] Exception:",
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
// UNASSIGN STUDENT - DELETE VERSION
//
// DELETE /unassign-student/:studentUserId
//
// Kept for compatibility with frontend code using DELETE.
// ============================================================

router.delete(
  "/unassign-student/:studentUserId",
  studentAssignmentLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const db = req.adminSupabase;
      const mentorUserId = req.user.id;
      const { studentUserId } = req.params;

      if (!studentUserId) {
        return res.status(400).json({
          success: false,
          error: "studentUserId is required",
        });
      }

      const {
        data: existingAssignment,
        error: lookupError,
      } = await db
        .from("squad_students")
        .select("*")
        .eq("mentor_user_id", mentorUserId)
        .eq("student_user_id", studentUserId)
        .maybeSingle();

      if (lookupError) {
        return res.status(400).json({
          success: false,
          error: lookupError.message,
        });
      }

      if (!existingAssignment) {
        return res.status(404).json({
          success: false,
          error:
            "Student is not assigned to this mentor",
        });
      }

      const {
        data: deletedAssignment,
        error: deleteError,
      } = await db
        .from("squad_students")
        .delete()
        .eq("mentor_user_id", mentorUserId)
        .eq("student_user_id", studentUserId)
        .select();

      if (deleteError) {
        return res.status(400).json({
          success: false,
          error: deleteError.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Student unassigned successfully",
        student_user_id: studentUserId,
        deleted: deletedAssignment || [],
      });
    } catch (error) {
      console.error(
        "[UNASSIGN STUDENT DELETE] Exception:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to unassign student",
      });
    }
  }
);

// ============================================================
// GET DIRECTLY ASSIGNED STUDENTS
// ============================================================

router.get(
  "/assigned-students",
  requireAuth,
  async (req, res) => {
    try {
      const db = req.adminSupabase;
      const mentorUserId = req.user.id;

      const {
        data: assignments,
        error: assignmentError,
      } = await db
        .from("squad_students")
        .select(`
          squad_id,
          student_user_id,
          assigned_at
        `)
        .eq("mentor_user_id", mentorUserId)
        .order("assigned_at", {
          ascending: false,
        });

      if (assignmentError) {
        console.error(
          "[ASSIGNED STUDENTS] Error:",
          assignmentError
        );

        return res.status(400).json({
          success: false,
          error: assignmentError.message,
        });
      }

      if (!assignments?.length) {
        return res.status(200).json({
          success: true,
          students: [],
        });
      }

      const studentIds = assignments
        .map(
          (assignment) =>
            assignment.student_user_id
        )
        .filter(Boolean);

      const [
        {
          data: profiles,
          error: profileError,
        },
        {
          data: leaderboard,
          error: leaderboardError,
        },
      ] = await Promise.all([
        db
          .from("profiles")
          .select("*")
          .in("user_id", studentIds),

        db
          .from("leetcode_leaderboard")
          .select("*")
          .in("user_id", studentIds),
      ]);

      if (profileError || leaderboardError) {
        const error =
          profileError ||
          leaderboardError;

        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      const profileMap = new Map(
        (profiles || []).map((profile) => [
          String(profile.user_id),
          profile,
        ])
      );

      const leaderboardMap = new Map(
        (leaderboard || []).map((row) => [
          String(row.user_id),
          row,
        ])
      );

      const students = assignments.map(
        (assignment) => {
          const profile =
            profileMap.get(
              String(
                assignment.student_user_id
              )
            ) || {};

          return {
            ...profile,

            ...(leaderboardMap.get(
              String(
                assignment.student_user_id
              )
            ) || {}),

            id:
              profile.user_id ||
              profile.id ||
              assignment.student_user_id,

            student_user_id:
              assignment.student_user_id,

            squad_id:
              assignment.squad_id ??
              profile.squad_id ??
              null,

            assigned_at:
              assignment.assigned_at,
          };
        }
      );

      return res.status(200).json({
        success: true,
        students,
      });
    } catch (error) {
      console.error(
        "[MENTOR ASSIGNED STUDENTS] Fetch exception:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// ============================================================
// HELPER: GET STUDENTS MENTOR CAN REVIEW
// ============================================================

const getMentorReviewStudents = async (
  db,
  mentorUserId
) => {
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

  let squadProfiles = [];

  if (squadIds.length > 0) {
    const { data, error } = await db
      .from("profiles")
      .select(`
        user_id,
        squad_id
      `)
      .in("squad_id", squadIds);

    if (error) {
      console.error("Fetch Squads Error:", error);
      return res.status(400).json({ error: error.message });
    }

    const squads = data ? data.map((item) => item.squad_id) : [];

    return res.status(200).json({
      success: true,
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

  const studentMap = new Map();

  // Directly assigned students
  for (const assignment of directAssignments || []) {
    if (!assignment.student_user_id) {
      continue;
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

  // Students belonging to mentor's squads
  for (const profile of squadProfiles || []) {
    if (!profile.user_id) {
      continue;
    }

    const studentId = String(profile.user_id);

    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student_user_id: profile.user_id,

        squad_id:
          profile.squad_id ?? null,

    if (assignedSquadIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, students: [] });
    }

  return {
    squadIds,
    students: Array.from(studentMap.values()),
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
  const { students } =
    await getMentorReviewStudents(
      db,
      mentorUserId
    );

  return (
    students.find(
      (student) =>
        String(student.student_user_id) ===
        String(studentUserId)
    ) || null
  );
};

// ============================================================
// HELPER: UPDATE LEADERBOARD REVIEW STATUS
//
// ANTI-CHEAT LOGIC
// ============================================================

const updateStudentReviewStatus = async (
  db,
  studentUserId
) => {
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
      return res.status(200).json({ success: true, students: [] });
    }

  if (hasRejectedReviews) {
    isSuspended = true;

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
          (p) => String(p.user_id) === String(assignment.student_user_id),
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

  const { error: leaderboardError } = await db
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
});

  return {
    pendingCount:
      Number(pendingCount || 0),

    rejectedCount:
      Number(rejectedCount || 0),

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
      const db = req.adminSupabase;

      const {
        squadIds,
        students: reviewStudents,
      } = await getMentorReviewStudents(
        db,
        mentorUserId
      );

      if (reviewStudents.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          reviews: [],
        });
      }

      const studentIds = reviewStudents
        .map(
          (student) =>
            student.student_user_id
        )
        .filter(Boolean);

    const { data: assignments, error: assignmentError } = await db
      .from("squad_students")
      .select("student_user_id, squad_id, assigned_at")
      .eq("mentor_user_id", mentorUserId);

      if (submissionError) {
        return res.status(400).json({
          success: false,
          error: submissionError.message,
        });
      }

      if (
        !pendingSubmissions ||
        pendingSubmissions.length === 0
      ) {
        return res.status(200).json({
          success: true,
          count: 0,
          reviews: [],
        });
      }

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
        return res.status(400).json({
          success: false,
          error: profileError.message,
        });
      }

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
        return res.status(400).json({
          success: false,
          error:
            leaderboardError.message,
        });
      }

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

      for (const row of leaderboardData || []) {
        if (row.user_id) {
          leaderboardMap.set(
            String(row.user_id),
            row
          );
        }
      }

      const assignmentMap = new Map();

      for (const student of reviewStudents) {
        assignmentMap.set(
          String(student.student_user_id),
          student
        );
      }

      const pendingMap = new Map();

      for (const submission of pendingSubmissions) {
        const studentId = String(
          submission.user_id
        );

        if (!pendingMap.has(studentId)) {
          pendingMap.set(studentId, []);
        }

        pendingMap.get(studentId).push({
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

      const reviews = [];

      for (const studentId of pendingStudentIds) {
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
          student_user_id: studentId,

          name:
            profile.name ||
            "Unknown Student",

          avatar_url:
            profile.avatar_url || null,

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
            Number(leaderboard.score) || 0,

        total_solved: leaderboard.total_solved || 0,

        score: leaderboard.score || 0,

        pending_review_count: studentPendingSubmissions.length,

          pending_submissions:
            submissions,
        });
      }

      reviews.sort(
        (a, b) =>
          b.pending_review_count -
          a.pending_review_count
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

      const mentorUserId = req.user.id;
      const db = req.adminSupabase;

      const assignment =
        await verifyMentorCanReviewStudent(
          db,
          mentorUserId,
          studentUserId
        );

      if (pendingError) {
        return res.status(400).json({
          error: pendingError.message,
        });
      }

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
        return res.status(400).json({
          error: error.message,
        });
      }

      if (!updated || updated.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No pending reviews found",
        });
      }

      const reviewStatus =
        await updateStudentReviewStatus(
          db,
          studentUserId
        );
      }

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
  },
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

      const mentorUserId = req.user.id;
      const db = req.adminSupabase;

      const assignment =
        await verifyMentorCanReviewStudent(
          db,
          mentorUserId,
          studentUserId
        );

      if (pendingError) {
        return res.status(400).json({
          error: pendingError.message,
        });
      }

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
        return res.status(400).json({
          error: error.message,
        });
      }

      if (!updated || updated.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No pending reviews found",
        });
      }

      const reviewStatus =
        await updateStudentReviewStatus(
          db,
          studentUserId
        );
      }

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
  },
);

export default router;
