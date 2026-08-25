import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// --- Rate Limiters Config ---
const allprofilesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 30, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many directory requests, please try again in 15 minutes.' }
});

const singleStudentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many profile requests, please try again in 15 minutes.' }
});

const statsRouteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many stats requests. Please try again later." },
});

const updateProfileLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many profile update requests. Please try again later." },
});

// --- Validation Helpers ---
const isValidGitHubUsername = (username) => /^[a-zA-Z0-9-]{1,39}$/.test(username);
const isValidLeetCodeUsername = (username) => /^[a-zA-Z0-9_-]{1,30}$/.test(username);

const extractUsername = (input, platform) => {
    if (!input) return null;
    const cleanInput = input.trim();
    try {
        if (platform === "github") {
            if (!cleanInput.includes("github.com")) return cleanInput;
            return cleanInput.match(/github\.com\/([^/]+)/)?.[1]?.replace(/\/$/, "") || null;
        }
        if (platform === "leetcode") {
            if (!cleanInput.includes("leetcode.com")) return cleanInput;
            return cleanInput.match(/leetcode\.com\/(?:u\/)?([^/]+)/)?.[1]?.replace(/\/$/, "") || null;
        }
    } catch (e) {
        return null;
    }
    return null;
};

// Helper to extract boolean active flag from joined relation
const formatProfileWithActivity = (profile) => {
    if (!profile) return profile;

    const lbData = Array.isArray(profile.leetcode_leaderboard)
        ? profile.leetcode_leaderboard[0]
        : profile.leetcode_leaderboard;

    const totalSolved = Number(lbData?.total_solved ?? profile.total_solved ?? 0) || 0;
    const hasSolvedProblems = totalSolved > 0;
    const lastSolvedAt = hasSolvedProblems ? (lbData?.last_solved_at || profile.last_solved_at || null) : null;
    const rawActive = lbData?.is_leetcode_active ?? profile.is_leetcode_active ?? false;

    const effectiveIsActive =
        hasSolvedProblems &&
        (rawActive === true || rawActive === 1 || rawActive === "true" || rawActive === "1")
            ? true
            : hasSolvedProblems && lastSolvedAt
                ? (() => {
                    const solvedDate = new Date(lastSolvedAt);
                    if (Number.isNaN(solvedDate.getTime())) return false;
                    return solvedDate.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;
                })()
                : false;

    const { leetcode_leaderboard, ...rest } = profile;

    return {
        ...rest,
        is_leetcode_active: effectiveIsActive,
        last_solved_at: lastSolvedAt,
        total_solved: totalSolved,
    };
};

// ==========================================
// 1. GET all profiles or filter using ?user_id= query
// ==========================================
router.get('/profiles', allprofilesLimiter, async (req, res) => {
  try {
    const { user_id } = req.query;

    if (user_id) {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
            user_id, name, title, role, avatar_url, github, leetcode, linkedin,
            leetcode_leaderboard ( is_leetcode_active, last_solved_at, total_solved )
        `)
        .eq('user_id', user_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Student not found' });
        }
        return res.status(400).json({ error: error.message });
      }

      return res.json(formatProfileWithActivity(data));
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(`
          user_id, name, title, squad_id, avatar_url, github, leetcode, linkedin,
          leetcode_leaderboard ( is_leetcode_active, last_solved_at, total_solved )
      `);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const formattedData = (data || []).map(formatProfileWithActivity);
    return res.json(formattedData);
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// ==========================================
// GET Featured Students
// ==========================================
router.get("/profiles/featured", allprofilesLimiter, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, name, title, avatar_url");

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const shuffled = [...data];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    res.json(shuffled.slice(0, 4));
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

// ==========================================
// 2. GET single student profile using REST path parameter /profiles/:user_id
// ==========================================
router.get('/profiles/:user_id', singleStudentLimiter, async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        leetcode_leaderboard ( is_leetcode_active, last_solved_at, total_solved )
      `) 
      .eq('user_id', user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Student not found' });
      }
      return res.status(400).json({ error: error.message });
    }

    return res.json(formatProfileWithActivity(data));
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// ==========================================
// 3. PUT / UPDATE Student Profile
// ==========================================
router.put("/updateprofile", updateProfileLimiter, async (req, res) => {
    try {
        const updatePayload = req.body;
        if (!updatePayload || Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ error: "No profile data provided to update." });
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

        if (!user_id) {
            return res.status(400).json({ error: "user_id is required in the payload to update." });
        }

        const rawSquad = squadId !== undefined ? squadId : restPayload.squad_id;
        const parsedSquad = rawSquad !== "" && rawSquad !== null && rawSquad !== undefined ? parseInt(rawSquad, 10) : null;

        const cleanPayload = {
            ...restPayload,
            user_id: user_id, 
            squad_id: Number.isNaN(parsedSquad) ? null : parsedSquad,
            personal_email: personalEmail !== undefined ? personalEmail : restPayload.personal_email || null,
            resume_url: resumeUrl !== undefined ? resumeUrl : restPayload.resume_url || null,
        };

        if (name !== undefined) cleanPayload.name = name;
        if (kalvium_email !== undefined || kalviumEmail !== undefined) {
            cleanPayload.kalvium_email = kalvium_email || kalviumEmail || null;
        }

        let { data, error: dbError } = await supabase
            .from("profiles")
            .update(cleanPayload)
            .eq("user_id", user_id)
            .select()
            .maybeSingle();

        if (!data && !dbError) {
            const insertResult = await supabase
                .from("profiles")
                .insert([cleanPayload])
                .select()
                .single();

            data = insertResult.data;
            dbError = insertResult.error;
        }

        if (dbError) {
            console.error("Database error:", dbError);
            return res.status(500).json({ error: dbError.message || "Failed to save profile." });
        }

        return res.status(200).json({
            message: "Profile saved successfully",
            data: data
        });

    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ==========================================
// 4. POST GitHub Profile Stats
// ==========================================
router.post("/github", async (req, res) => {
    const { url } = req.body;
    const username = extractUsername(url, "github");

    if (!username || !isValidGitHubUsername(username)) {
        return res.status(400).json({ error: "Invalid GitHub URL" });
    }

    try {
        const headers = { "User-Agent": "Student-Dashboard-App" };
        const [userRes, reposRes] = await Promise.all([
            fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }),
            fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=1`, { headers })
        ]);

        if (!userRes.ok) {
            return res.status(userRes.status).json({ error: "GitHub user not found or rate limited" });
        }

        const userData = await userRes.json();
        const reposData = reposRes.ok ? await reposRes.json() : [];
        const publicRepos = userData.public_repos ?? 0;

        return res.status(200).json({
            repos: publicRepos,
            public_repos: publicRepos,
            followers: userData.followers || 0,
            recentRepo: Array.isArray(reposData) && reposData.length > 0 ? reposData[0].name : "No recent activity",
        });
    } catch (err) {
        console.error("GitHub Fetch Error:", err);
        return res.status(500).json({ error: "Failed to fetch GitHub data" });
    }
});

// ==========================================
// 5. POST LeetCode Profile Stats (Official GraphQL API)
// ==========================================
router.post("/leetcode", statsRouteLimiter, async (req, res) => {
    const { url } = req.body;
    const username = extractUsername(url, "leetcode");

    if (!username || !isValidLeetCodeUsername(username)) {
        return res.status(400).json({ error: "Invalid LeetCode URL" });
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
                recentSubmissionList(username: $username, limit: 3) {
                    title
                    timestamp
                    statusDisplay
                }
            }
        `;

        const response = await fetch("https://leetcode.com/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Referer": "https://leetcode.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: JSON.stringify({
                query,
                variables: { username }
            })
        });

        if (!response.ok) {
            return res.status(502).json({ error: "Failed to reach official LeetCode service" });
        }

        const result = await response.json();

        if (!result.data || !result.data.matchedUser) {
            return res.status(404).json({ error: "LeetCode profile not found for this username" });
        }

        const user = result.data.matchedUser;
        const submitStats = user.submitStatsGlobal?.acSubmissionNum || [];

        const totalSolved = submitStats.find(s => s.difficulty === "All")?.count || 0;
        const easySolved = submitStats.find(s => s.difficulty === "Easy")?.count || 0;
        const mediumSolved = submitStats.find(s => s.difficulty === "Medium")?.count || 0;
        const hardSolved = submitStats.find(s => s.difficulty === "Hard")?.count || 0;

        const recentSubmissionsRaw = result.data.recentSubmissionList || [];
        const recentSubmissions = recentSubmissionsRaw.map((sub) => ({
            title: sub.title || "Solved Problem",
            statusDisplay: sub.statusDisplay || "Accepted",
            timestamp: sub.timestamp,
            timeAgo: sub.timestamp ? new Date(Number(sub.timestamp) * 1000).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }) : "Recently"
        }));

        return res.status(200).json({
            username: user.username,
            totalSolved,
            easySolved,
            mediumSolved,
            hardSolved,
            ranking: user.profile?.ranking || "N/A",
            recentSubmissions,
            lastSolvedQuestion: recentSubmissions[0]?.title || null,
            lastSolvedAt: recentSubmissions[0]?.timestamp || null
        });

    } catch (err) {
        console.error("LeetCode Fetch Error:", err);
        return res.status(500).json({ error: "Failed to fetch LeetCode data: " + err.message });
    }
});

// ==========================================
// 6. GET /leetcode-leaderboard (Fetch Leaderboard Data)
// ==========================================
router.get("/leetcode-leaderboard", async (req, res) => {
    try {

        // ------------------------------------------
        // 1. Fetch leaderboard with safe select
        // ------------------------------------------

        const {
            data,
            error
        } = await supabase
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
                is_leetcode_active
            `)
            .order("score", { ascending: false });

        if (error) {
            console.error("Leaderboard query error:", error);
            return res.status(400).json({
                error: error.message
            });
        }

        if (!data || data.length === 0) {
            return res.status(200).json([]);
        }

        // ------------------------------------------
        // 2. Get unique user IDs and fetch profiles
        // ------------------------------------------

        const userIds = data.map(row => row.user_id).filter(Boolean);

        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("user_id, name, squad_id, avatar_url")
            .in("user_id", userIds);

        if (profileError) {
            console.error("Profile fetch error:", profileError);
            // Continue without profile data
        }

        const profileMap = {};
        (profileData || []).forEach(profile => {
            profileMap[profile.user_id] = profile;
        });

        // ------------------------------------------
        // 3. Filter out students with pending reviews
        // ------------------------------------------

        const {
            data: pendingSubmissions,
        } = await supabase
            .from("leetcode_submissions")
            .select("user_id")
            .eq("review_status", "pending");

        const pendingUserIds = new Set(
            (pendingSubmissions || [])
                .map(row => row.user_id)
        );

        // ------------------------------------------
        // 4. Merge leaderboard with profile data
        // ------------------------------------------

        const leaderboardWithProfiles = data
            .map(entry => ({
                ...entry,
                profiles: profileMap[entry.user_id] || {}
            }))
            .filter(student => !pendingUserIds.has(student.user_id));

        // ------------------------------------------
        // 5. Return clean leaderboard
        // ------------------------------------------

        return res.status(200).json(leaderboardWithProfiles);

    } catch (err) {

        console.error(
            "Leaderboard error:",
            err
        );

        return res.status(500).json({
            error: "Internal Server Error",
            details: err.message
        });
    }
});

// ==========================================
// 7. GET LEETCODE RECENT SUBMISSIONS
// ==========================================
router.post("/leetcode-submissions", statsRouteLimiter, async (req, res) => {
    console.log("🔥🔥🔥 LEETCODE SUBMISSIONS ROUTE CALLED 🔥🔥🔥");
    console.log("BODY:", req.body);

    // your existing code continues here...

    const username = extractUsername(url, "leetcode");

    if (!username) {
        return res.status(400).json({
            error: "Invalid LeetCode username or URL"
        });
    }

    if (!user_id) {
        return res.status(400).json({
            error: "user_id is required"
        });
    }

    try {
        // ------------------------------------------
        // Fetch recent accepted submissions
        // ------------------------------------------

        const query = `
            query getRecentSubmissions($username: String!) {
                recentAcSubmissionList(username: $username) {
                    id
                    title
                    titleSlug
                    timestamp
                    lang
                }
            }
        `;

        const response = await fetch(
            "https://leetcode.com/graphql",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Referer": "https://leetcode.com/",
                    "User-Agent": "Mozilla/5.0"
                },

                body: JSON.stringify({
                    query,
                    variables: {
                        username
                    }
                })
            }
        );

        if (!response.ok) {
            return res.status(502).json({
                error: "Failed to reach LeetCode"
            });
        }

        const result = await response.json();

        const submissions =
            result?.data?.recentAcSubmissionList || [];

        if (submissions.length === 0) {
            return res.status(200).json({
                success: true,
                submissions: []
            });
        }

        // ------------------------------------------
        // Convert timestamps
        // ------------------------------------------

        const sortedSubmissions = [...submissions]
            .map((submission) => ({
                ...submission,
                submittedAt: new Date(
                    Number(submission.timestamp) * 1000
                )
            }))
            .sort(
                (a, b) =>
                    a.submittedAt.getTime() -
                    b.submittedAt.getTime()
            );

        // ------------------------------------------
        // Create database records
        // ------------------------------------------

        const records = sortedSubmissions.map(
            (submission, index) => {

                let reviewStatus = "approved";
                let flaggedReason = null;

                // Compare with previous accepted solve
                if (index > 0) {

                    const previous =
                        sortedSubmissions[index - 1];

                    const differenceMs =
                        submission.submittedAt.getTime() -
                        previous.submittedAt.getTime();

                    const differenceSeconds =
                        differenceMs / 1000;

                    // --------------------------------------
                    // RAPID SOLVE DETECTION
                    // --------------------------------------

                    if (differenceSeconds <= 120) {

                        reviewStatus = "pending";

                        flaggedReason =
                            `Solved ${Math.round(
                                differenceSeconds
                            )} seconds after previous solve`;
                    }
                }

                return {
                    user_id: user_id,

                    leetcode_username:
                        username,

                    submission_id:
                        String(submission.id),

                    title_slug:
                        submission.titleSlug,

                    difficulty:
                        null,

                    submitted_at:
                        submission.submittedAt.toISOString(),

                    review_status:
                        reviewStatus,

                    flagged_reason:
                        flaggedReason
                };
            }
        );

        // ------------------------------------------
        // Save to Supabase
        // ------------------------------------------

        const {
            data,
            error
        } = await supabase
            .from("leetcode_submissions")
            .upsert(
                records,
                {
                    onConflict: "submission_id"
                }
            )
            .select();

        if (error) {

            console.error(
                "Save LeetCode submissions error:",
                error
            );

            return res.status(500).json({
                error: error.message
            });
        }

        // ------------------------------------------
        // Response
        // ------------------------------------------

        return res.status(200).json({
            success: true,

            username,

            count:
                data?.length || 0,

            submissions:
                data || []
        });

    } catch (err) {

        console.error(
            "LeetCode submission fetch error:",
            err
        );

        return res.status(500).json({
            error:
                "Failed to fetch LeetCode submissions"
        });
    }
});

export default router;