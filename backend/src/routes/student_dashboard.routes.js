import express from "express";
import rateLimit from "express-rate-limit";

import {
  createAuthedSupabaseClient,
  supabase,
} from "../config/supabase.js";

const router = express.Router();

// ============================================================
// RATE LIMIT CONFIG
// ============================================================

const STATS_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const STATS_RATE_LIMIT_MAX_REQUESTS = 30;
const AUTH_ROUTE_RATE_LIMIT_MAX_REQUESTS = 120;

const authRouteLimiter = rateLimit({
  windowMs: STATS_RATE_LIMIT_WINDOW_MS,
  max: AUTH_ROUTE_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many profile requests. Please try again later.",
  },
});

const statsRouteLimiter = rateLimit({
  windowMs: STATS_RATE_LIMIT_WINDOW_MS,
  max: STATS_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many stats requests. Please try again later.",
  },
});

// ============================================================
// VALIDATION HELPERS
// ============================================================

const isValidGitHubUsername = (username) => {
  return /^[a-zA-Z0-9-]{1,39}$/.test(username);
};

const isValidLeetCodeUsername = (username) => {
  return /^[a-zA-Z0-9_-]{1,30}$/.test(username);
};

const extractUsername = (url, platform) => {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    if (platform === "github") {
      const match = url.match(
        /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/
      );

      return match?.[1] || null;
    }

    if (platform === "leetcode") {
      const match = url.match(
        /(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([^/?#]+)/
      );

      return match?.[1] || null;
    }
  } catch {
    return null;
  }

  return null;
};

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        error: "Missing authentication token",
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    req.user = user;
    req.authedSupabase =
      createAuthedSupabaseClient(token);

    return next();
  } catch (error) {
    console.error(
      "[STUDENT AUTH ERROR]",
      error
    );

    return res.status(500).json({
      error:
        "Authentication check failed: " +
        error.message,
    });
  }
};

// ============================================================
// 1. GET STUDENT PROFILE
//
// GET /profile
// ============================================================

router.get(
  "/profile",
  authRouteLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const { data, error } =
        await req.authedSupabase
          .from("profiles")
          .select("*")
          .eq("user_id", req.user.id)
          .maybeSingle();

      if (error) {
        console.error(
          "[PROFILE FETCH ERROR]",
          error
        );

        return res.status(500).json({
          error:
            "Request failed: " +
            error.message,
        });
      }

      if (!data) {
        return res.status(404).json({
          error:
            "Profile not found for this user.",
        });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error(
        "[PROFILE FETCH EXCEPTION]",
        error
      );

      return res.status(500).json({
        error:
          "Request failed: " +
          error.message,
      });
    }
  }
);

// ============================================================
// 2. UPDATE STUDENT PROFILE
//
// PUT /updateprofile
// ============================================================

router.put(
  "/updateprofile",
  authRouteLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const updatePayload = req.body;

      if (
        !updatePayload ||
        Object.keys(updatePayload).length === 0
      ) {
        return res.status(400).json({
          error:
            "No profile data provided to update.",
        });
      }

      const {
        id,
        auth_id,
        user_id,
        display_id,
        name,
        kalvium_email,
        kalviumEmail,
        squadId,
        personalEmail,
        resumeUrl,
        ...restPayload
      } = updatePayload;

      const rawSquad =
        squadId !== undefined
          ? squadId
          : restPayload.squad_id;

      const parsedSquad =
        rawSquad !== "" &&
        rawSquad !== null &&
        rawSquad !== undefined
          ? parseInt(rawSquad, 10)
          : null;

      const cleanPayload = {
        ...restPayload,

        user_id: req.user.id,

        squad_id: Number.isNaN(parsedSquad)
          ? null
          : parsedSquad,

        personal_email:
          personalEmail !== undefined
            ? personalEmail
            : restPayload.personal_email || null,

        resume_url:
          resumeUrl !== undefined
            ? resumeUrl
            : restPayload.resume_url || null,
      };

      if (name !== undefined) {
        cleanPayload.name = name;
      }

      if (
        kalvium_email !== undefined ||
        kalviumEmail !== undefined
      ) {
        cleanPayload.kalvium_email =
          kalvium_email ||
          kalviumEmail ||
          null;
      }

      // --------------------------------------------------------
      // UPDATE EXISTING PROFILE
      // --------------------------------------------------------

      let {
        data,
        error: dbError,
      } = await req.authedSupabase
        .from("profiles")
        .update(cleanPayload)
        .eq("user_id", req.user.id)
        .select()
        .maybeSingle();

      // --------------------------------------------------------
      // CREATE PROFILE IF IT DOES NOT EXIST
      // --------------------------------------------------------

      if (!data && !dbError) {
        const insertResult =
          await req.authedSupabase
            .from("profiles")
            .insert([cleanPayload])
            .select()
            .single();

        data = insertResult.data;
        dbError = insertResult.error;
      }

      if (dbError) {
        console.error(
          "[PROFILE DATABASE ERROR]",
          dbError
        );

        return res.status(500).json({
          error:
            dbError.message ||
            "Failed to save profile.",
        });
      }

      return res.status(200).json({
        message:
          "Profile saved successfully",
        data,
      });
    } catch (error) {
      console.error(
        "[PROFILE UPDATE ERROR]",
        error
      );

      return res.status(500).json({
        error:
          "Internal server error",
      });
    }
  }
);

// ============================================================
// 3. GITHUB PROFILE STATS
//
// POST /github
// ============================================================

router.post(
  "/github",
  statsRouteLimiter,
  requireAuth,
  async (req, res) => {
    const { url } = req.body;

    const username =
      extractUsername(url, "github");

    if (
      !username ||
      !isValidGitHubUsername(username)
    ) {
      return res.status(400).json({
        error: "Invalid GitHub URL",
      });
    }

    try {
      const headers = {
        "User-Agent":
          "Student-Dashboard-App",
      };

      const [userRes, reposRes] =
        await Promise.all([
          fetch(
            `https://api.github.com/users/${encodeURIComponent(
              username
            )}`,
            { headers }
          ),

          fetch(
            `https://api.github.com/users/${encodeURIComponent(
              username
            )}/repos?sort=pushed&per_page=1`,
            { headers }
          ),
        ]);

      if (!userRes.ok) {
        return res
          .status(userRes.status)
          .json({
            error:
              "GitHub user not found or rate limited",
          });
      }

      const userData =
        await userRes.json();

      const reposData =
        reposRes.ok
          ? await reposRes.json()
          : [];

      return res.status(200).json({
        repos:
          userData.public_repos || 0,

        followers:
          userData.followers || 0,

        recentRepo:
          Array.isArray(reposData) &&
          reposData.length > 0
            ? reposData[0].name
            : "No recent activity",
      });
    } catch (error) {
      console.error(
        "[GITHUB FETCH ERROR]",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch GitHub data",
      });
    }
  }
);

// ============================================================
// 4. LEETCODE PROFILE STATS
//
// POST /leetcode
// ============================================================

router.post(
  "/leetcode",
  statsRouteLimiter,
  requireAuth,
  async (req, res) => {
    const { url } = req.body;

    const username =
      extractUsername(url, "leetcode");

    if (
      !username ||
      !isValidLeetCodeUsername(username)
    ) {
      return res.status(400).json({
        error: "Invalid LeetCode URL",
      });
    }

    try {
      const query = `
        query getUserStats($username: String!) {
          matchedUser(username: $username) {
            username

            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }

            profile {
              ranking
              reputation
            }
          }

          recentSubmissionList(
            username: $username
            limit: 3
          ) {
            title
            timestamp
            statusDisplay
          }
        }
      `;

      const response = await fetch(
        "https://leetcode.com/graphql",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Referer:
              "https://leetcode.com",

            "User-Agent":
              "Mozilla/5.0",
          },

          body: JSON.stringify({
            query,
            variables: {
              username,
            },
          }),
        }
      );

      if (!response.ok) {
        return res.status(502).json({
          error:
            "Failed to reach official LeetCode service",
        });
      }

      const result =
        await response.json();

      if (
        !result.data ||
        !result.data.matchedUser
      ) {
        return res.status(404).json({
          error:
            "LeetCode profile not found for this username",
        });
      }

      const user =
        result.data.matchedUser;

      const submitStats =
        user.submitStatsGlobal
          ?.acSubmissionNum || [];

      const totalSolved =
        submitStats.find(
          (item) =>
            item.difficulty === "All"
        )?.count || 0;

      const easySolved =
        submitStats.find(
          (item) =>
            item.difficulty === "Easy"
        )?.count || 0;

      const mediumSolved =
        submitStats.find(
          (item) =>
            item.difficulty === "Medium"
        )?.count || 0;

      const hardSolved =
        submitStats.find(
          (item) =>
            item.difficulty === "Hard"
        )?.count || 0;

      const recentSubmissionsRaw =
        result.data.recentSubmissionList || [];

      const recentSubmissions =
        recentSubmissionsRaw.map(
          (submission) => {
            let formattedDate =
              "Recently";

            if (submission.timestamp) {
              const dateObj = new Date(
                Number(
                  submission.timestamp
                ) * 1000
              );

              formattedDate =
                dateObj.toLocaleString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );
            }

            return {
              title:
                submission.title,

              statusDisplay:
                submission.statusDisplay,

              timestamp:
                submission.timestamp,

              timeAgo:
                formattedDate,
            };
          }
        );

      return res.status(200).json({
        username:
          user.username,

        totalSolved,

        easySolved,

        mediumSolved,

        hardSolved,

        ranking:
          user.profile?.ranking ||
          "N/A",

        recentSubmissions,

        lastActive:
          recentSubmissions.length > 0
            ? recentSubmissions[0].timeAgo
            : "No recent activity",
      });
    } catch (error) {
      console.error(
        "[LEETCODE FETCH ERROR]",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch LeetCode data: " +
          error.message,
      });
    }
  }
);

// ============================================================
// 5. GET PENDING MENTOR REVIEW STATUS
//
// GET /pending-review
//
// Checks the logged-in student's own submissions.
// Includes:
// - isPendingReview
// - hasPendingReview
// - pendingReviewCount
// - pending submissions
// - profile name
// - LeetCode username
// - total solved
// - suspension status
// ============================================================

router.get(
  "/pending-review",
  authRouteLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const userId = req.user.id;

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
        .eq("user_id", userId)
        .eq("review_status", "pending")
        .order("submitted_at", {
          ascending: false,
        });

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

      // ------------------------------------------------------
      // GET PROFILE
      // ------------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await req.authedSupabase
        .from("profiles")
        .select("name")
        .eq("user_id", userId)
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
        .eq("user_id", userId)
        .maybeSingle();

      // Don't fail the entire pending-review request
      // if leaderboard data is unavailable.
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
            Number(
              leaderboardData?.total_solved
            ) || 0,

          is_suspended:
            Boolean(
              leaderboardData?.is_suspended
            ),
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

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default router;