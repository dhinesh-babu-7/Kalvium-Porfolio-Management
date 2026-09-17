import express from "express";
import rateLimit from "express-rate-limit";
import { createAuthedSupabaseClient, supabase } from "../config/supabase.js";

const router = express.Router();

// --- Rate Limiters Config ---
const STATS_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const STATS_RATE_LIMIT_MAX_REQUESTS = 30;
const AUTH_ROUTE_RATE_LIMIT_MAX_REQUESTS = 120;

const authRouteLimiter = rateLimit({
    windowMs: STATS_RATE_LIMIT_WINDOW_MS,
    max: AUTH_ROUTE_RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many profile requests. Please try again later." },
});

const statsRouteLimiter = rateLimit({
    windowMs: STATS_RATE_LIMIT_WINDOW_MS,
    max: STATS_RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many stats requests. Please try again later." },
});

// --- Validation Helpers ---
const isValidGitHubUsername = (username) => /^[a-zA-Z0-9-]{1,39}$/.test(username);
const isValidLeetCodeUsername = (username) => /^[a-zA-Z0-9_-]{1,30}$/.test(username);

const extractUsername = (url, platform) => {
    if (!url) return null;
    try {
        if (platform === "github") return url.match(/github\.com\/([^/]+)/)?.[1] || null;
        if (platform === "leetcode") return url.match(/leetcode\.com\/(?:u\/)?([^/]+)/)?.[1] || null;
    } catch (e) {
        return null;
    }
    return null;
};

// --- Authentication Middleware ---
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid Authorization header" });
        }

        const token = authHeader.split(" ")[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        req.user = user;
        req.authedSupabase = createAuthedSupabaseClient(token);
        next();
    } catch (err) {
        return res.status(500).json({ error: "Authentication check failed: " + err.message });
    }
};

// ==========================================
// 1. GET Student Profile
// ==========================================
router.get("/profile", authRouteLimiter, requireAuth, async (req, res) => {
    try {
        const { data, error } = await req.authedSupabase
            .from("profiles")
            .select("*")
            .eq("user_id", req.user.id)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: "Profile not found for this user." });
        }

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: "Request failed: " + err.message });
    }
});

// ==========================================
// 2. PUT / UPDATE Student Profile
// ==========================================
router.put("/updateprofile", authRouteLimiter, requireAuth, async (req, res) => {
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

        const rawSquad = squadId !== undefined ? squadId : restPayload.squad_id;
        const parsedSquad = rawSquad !== "" && rawSquad !== null && rawSquad !== undefined ? parseInt(rawSquad, 10) : null;

        const cleanPayload = {
            ...restPayload,
            user_id: req.user.id,
            squad_id: Number.isNaN(parsedSquad) ? null : parsedSquad,
            personal_email: personalEmail !== undefined ? personalEmail : restPayload.personal_email || null,
            resume_url: resumeUrl !== undefined ? resumeUrl : restPayload.resume_url || null,
        };

        // If 'name' and 'kalvium_email' exist in your database table, re-attach them here:
        if (name !== undefined) cleanPayload.name = name;
        if (kalvium_email !== undefined || kalviumEmail !== undefined) {
            cleanPayload.kalvium_email = kalvium_email || kalviumEmail || null;
        }

        // Attempt update first
        let { data, error: dbError } = await req.authedSupabase
            .from("profiles")
            .update(cleanPayload)
            .eq("user_id", req.user.id)
            .select()
            .maybeSingle();

        // Fallback to insert if record doesn't exist yet
        if (!data && !dbError) {
            const insertResult = await req.authedSupabase
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
// 3. POST GitHub Profile Stats
// ==========================================
router.post("/github", statsRouteLimiter, requireAuth, async (req, res) => {
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

        return res.status(200).json({
            repos: userData.public_repos || 0,
            followers: userData.followers || 0,
            recentRepo: Array.isArray(reposData) && reposData.length > 0 ? reposData[0].name : "No recent activity",
        });
    } catch (err) {
        console.error("GitHub Fetch Error:", err);
        return res.status(500).json({ error: "Failed to fetch GitHub data" });
    }
});

// ==========================================
// 4. POST LeetCode Profile Stats (Official GraphQL API)
// ==========================================
router.post("/leetcode", statsRouteLimiter, requireAuth, async (req, res) => {
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

        // Process recent submission list and format timestamp to human-readable date
        const recentSubmissionsRaw = result.data.recentSubmissionList || [];
        const recentSubmissions = recentSubmissionsRaw.map((sub) => {
            let formattedDate = "Recently";
            if (sub.timestamp) {
                const dateObj = new Date(parseInt(sub.timestamp) * 1000);
                formattedDate = dateObj.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });
            }

            return {
                title: sub.title,
                statusDisplay: sub.statusDisplay,
                timestamp: sub.timestamp,
                timeAgo: formattedDate
            };
        });

        return res.status(200).json({
            username: user.username,
            totalSolved,
            easySolved,
            mediumSolved,
            hardSolved,
            ranking: user.profile?.ranking || "N/A",
            recentSubmissions, // <--- Sends recent activity list to frontend
            lastActive: recentSubmissions.length > 0 ? recentSubmissions[0].timeAgo : "No recent activity"
        });

    } catch (err) {
        console.error("LeetCode Fetch Error:", err);
        return res.status(500).json({ error: "Failed to fetch LeetCode data: " + err.message });
    }
});

// ==========================================
// 6. GET Projects from project_details table
// ==========================================
router.get("/projects", authRouteLimiter, requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: projects, error: projectsError } = await req.authedSupabase
            .from("project_details")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (projectsError) {
            console.error("Projects fetch error:", projectsError);
            return res.status(400).json({ error: projectsError.message });
        }

        return res.status(200).json(projects || []);
    } catch (err) {
        console.error("Projects fetch error:", err);
        return res.status(500).json({ error: "Failed to fetch projects: " + err.message });
    }
});

// ==========================================
// 7. POST Add a new project
// ==========================================
router.post("/projects", authRouteLimiter, requireAuth, async (req, res) => {
    try {
        const { name, description, githubUrl, team } = req.body;

        if (!name || !description) {
            return res.status(400).json({ error: "Project name and description are required." });
        }

        const cleanedTeam = Array.isArray(team)
            ? team.filter((member) => member && member.trim() !== "")
            : [];

        const newProject = {
            user_id: req.user.id,
            project_title: name.trim(),
            project_desc: description.trim(),
            github_repo: githubUrl ? githubUrl.trim() : null,
            team: cleanedTeam,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data, error: insertError } = await req.authedSupabase
            .from("project_details")
            .insert([newProject])
            .select()
            .single();

        if (insertError) {
            console.error("Project insert error:", insertError);
            return res.status(500).json({ error: insertError.message || "Failed to add project." });
        }

        return res.status(201).json(data);
    } catch (err) {
        console.error("Add project error:", err);
        return res.status(500).json({ error: "Failed to add project: " + err.message });
    }
});

// ==========================================
// 8. DELETE a project
// ==========================================
router.delete("/projects/:id", authRouteLimiter, requireAuth, async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;

        // First verify the project belongs to this user
        const { data: existingProject, error: fetchError } = await req.authedSupabase
            .from("project_details")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError) {
            console.error("Project fetch error:", fetchError);
            return res.status(400).json({ error: fetchError.message });
        }

        if (!existingProject) {
            return res.status(404).json({ error: "Project not found or you don't have permission to delete it." });
        }

        const { error: deleteError } = await req.authedSupabase
            .from("project_details")
            .delete()
            .eq("id", projectId);

        if (deleteError) {
            console.error("Project delete error:", deleteError);
            return res.status(500).json({ error: deleteError.message || "Failed to delete project." });
        }

        return res.status(200).json({ message: "Project deleted successfully" });
    } catch (err) {
        console.error("Delete project error:", err);
        return res.status(500).json({ error: "Failed to delete project: " + err.message });
    }
});

// ==========================================
// 9. GET Achievements from achievements table
// ==========================================
router.get("/achievements", authRouteLimiter, requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: achievements, error: achievementsError } = await req.authedSupabase
            .from("achievements")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (achievementsError) {
            console.error("Achievements fetch error:", achievementsError);
            return res.status(400).json({ error: achievementsError.message });
        }

        return res.status(200).json(achievements || []);
    } catch (err) {
        console.error("Achievements fetch error:", err);
        return res.status(500).json({ error: "Failed to fetch achievements: " + err.message });
    }
});

// ==========================================
// 10. POST Add a new achievement
// ==========================================
router.post("/achievements", authRouteLimiter, requireAuth, async (req, res) => {
    try {
        const { title, description, category, icon, externalUrl } = req.body;

        if (!title || !category) {
            return res.status(400).json({ error: "Achievement title and category are required." });
        }

        const newAchievement = {
            user_id: req.user.id,
            title: title.trim(),
            description: description ? description.trim() : null,
            category: category.trim(),
            icon: icon ? icon.trim() : null,
            external_url: externalUrl ? externalUrl.trim() : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data, error: insertError } = await req.authedSupabase
            .from("achievements")
            .insert([newAchievement])
            .select()
            .single();

        if (insertError) {
            console.error("Achievement insert error:", insertError);
            return res.status(500).json({ error: insertError.message || "Failed to add achievement." });
        }

        return res.status(201).json(data);
    } catch (err) {
        console.error("Add achievement error:", err);
        return res.status(500).json({ error: "Failed to add achievement: " + err.message });
    }
});

// ==========================================
// 11. DELETE an achievement
// ==========================================
router.delete("/achievements/:id", authRouteLimiter, requireAuth, async (req, res) => {
    try {
        const achievementId = req.params.id;
        const userId = req.user.id;

        // First verify the achievement belongs to this user
        const { data: existingAchievement, error: fetchError } = await req.authedSupabase
            .from("achievements")
            .select("id")
            .eq("id", achievementId)
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError) {
            console.error("Achievement fetch error:", fetchError);
            return res.status(400).json({ error: fetchError.message });
        }

        if (!existingAchievement) {
            return res.status(404).json({ error: "Achievement not found or you don't have permission to delete it." });
        }

        const { error: deleteError } = await req.authedSupabase
            .from("achievements")
            .delete()
            .eq("id", achievementId);

        if (deleteError) {
            console.error("Achievement delete error:", deleteError);
            return res.status(500).json({ error: deleteError.message || "Failed to delete achievement." });
        }

        return res.status(200).json({ message: "Achievement deleted successfully" });
    } catch (err) {
        console.error("Delete achievement error:", err);
        return res.status(500).json({ error: "Failed to delete achievement: " + err.message });
    }
});

export default router;