import express from "express";
import rateLimit from "express-rate-limit";
import { createAuthedSupabaseClient, supabase } from "../config/supabase.js";

const router = express.Router();

const authRouteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many profile requests. Please try again later.",
  },
});

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.substring(7).trim();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

    req.user = user;
    req.authedSupabase = createAuthedSupabaseClient(token);
    next();
  } catch (error) {
    return res.status(500).json({
      error: "Authentication check failed: " + error.message,
    });
  }
};

// ============================================================
// GET PENDING MENTOR REVIEW STATUS
//
// GET /pending-review
//
// Checks the logged-in student's own submissions.
// ============================================================

router.get(
  "/pending-review",
  authRouteLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      console.log(
        "[PENDING REVIEW] Checking student:",
        userId
      );

      // ------------------------------------------------------
      // GET PENDING SUBMISSIONS
      // ------------------------------------------------------

      const {
        data: pendingSubmissions,
        error: submissionError,
      } = await req.authedSupabase
        .from("leetcode_submissions")
        .select(`
          id,
          submission_id,
          title_slug,
          difficulty,
          submitted_at,
          flag_reason,
          review_status,
          status,
          created_at
        `)
        .eq(
          "user_id",
          userId
        )
        .eq(
          "review_status",
          "pending"
        )
        .order(
          "submitted_at",
          {
            ascending: false,
          }
        );

      if (submissionError) {
        console.error(
          "[PENDING REVIEW FETCH ERROR]",
          submissionError
        );

        return res.status(400).json({
          error:
            submissionError.message,
        });
      }

      const pendingReviewCount =
        pendingSubmissions?.length || 0;

      const isPendingReview =
        pendingReviewCount > 0;

      console.log(
        "[PENDING REVIEW] Result:",
        {
          userId,
          pendingReviewCount,
          isPendingReview,
        }
      );

      // ------------------------------------------------------
      // GET PROFILE
      // ------------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await req.authedSupabase
        .from("profiles")
        .select("name")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

      if (profileError) {
        console.error(
          "[PROFILE FETCH ERROR]",
          profileError
        );

        return res.status(400).json({
          error:
            profileError.message,
        });
      }

      // ------------------------------------------------------
      // GET LEADERBOARD
      // ------------------------------------------------------

      const {
        data: leaderboardData,
        error: leaderboardError,
      } = await req.authedSupabase
        .from("leetcode_leaderboard")
        .select(`
          leetcode_username,
          total_solved,
          is_suspended
        `)
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

      if (leaderboardError) {
        console.error(
          "[LEADERBOARD FETCH ERROR]",
          leaderboardError
        );
      }

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      return res.status(200).json({
        isPendingReview,

        hasPendingReview:
          isPendingReview,

        pendingReviewCount,

        submissions:
          pendingSubmissions || [],

        profile: {
          ...(profile || {}),

          leetcode_username:
            leaderboardData
              ?.leetcode_username ||
            null,

          total_solved:
            leaderboardData
              ?.total_solved || 0,

          is_suspended:
            leaderboardData
              ?.is_suspended || false,
        },
      });
    } catch (error) {
      console.error(
        "[PENDING REVIEW STATUS ERROR]",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch pending review status: " +
          error.message,
      });
    }
  }
);

export default router;