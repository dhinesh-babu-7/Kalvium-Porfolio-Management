import express from "express";
import rateLimit from "express-rate-limit";
import { createAuthedSupabaseClient, supabase, supabaseAdmin } from "../config/supabase.js";

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

// Role guard: student-only routes reject mentors (and role-less accounts)
// with 403. Mirrors the frontend AuthGate allowedRoles check. Only
// app_metadata is trusted: user_metadata is self-writable by the user and
// must never decide authorization (privilege-escalation risk).
const requireRole = (...allowedRoles) => (req, res, next) => {
  const role = req.user?.app_metadata?.role ?? null;
    if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
};

const requireStudent = requireRole("student");

// Monthly quota of LeetCode exception requests per student (calendar month,
// UTC — same clock the DB's NOW() uses). Shared by the POST route (enforce)
// and the GET route (report, so the form can disable itself up front).
const MONTHLY_REQUEST_LIMIT = 2;

// ==========================================
// 1. GET Student Profile
// ==========================================
router.get("/profile", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.put("/updateprofile", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.post("/github", statsRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.post("/leetcode", statsRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.get("/projects", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.post("/projects", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.delete("/projects/:id", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.get("/achievements", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.post("/achievements", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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
router.delete("/achievements/:id", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
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

// ==========================================
// 12. POST Request a LeetCode exception (student -> assigned mentor)
// Body: { reason, days }   days = requested duration in days (1-4, default 3)
// Students may submit a new request even if a previous one is pending or was
// rejected — the only hard limit is the monthly quota below. On submit, every
// mentor linked to the student's squad gets an email (Brevo, fire-and-forget).
// ==========================================
router.post("/exception-request", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
    try {
        const reason = String(req.body?.reason || "").trim();
        if (reason.length < 10) {
            return res.status(400).json({ error: "Please give a reason (at least 10 characters)." });
        }
        if (reason.length > 2000) {
            return res.status(400).json({ error: "Reason is too long (max 2000 characters)." });
        }
        // Requested duration in days. Students pick e.g. 3-5 days.
        const MIN_EXCEPTION_DAYS = 1;
        const MAX_EXCEPTION_DAYS = 4;
        const rawDays = Number(req.body?.days ?? req.body?.requestedDays ?? 3);
        if (!Number.isFinite(rawDays) || !Number.isInteger(rawDays) || rawDays < MIN_EXCEPTION_DAYS || rawDays > MAX_EXCEPTION_DAYS) {
            return res.status(400).json({ error: `Please choose between ${MIN_EXCEPTION_DAYS} and ${MAX_EXCEPTION_DAYS} days.` });
        }
        const requestedDays = rawDays;
        if (!supabaseAdmin) {
            return res.status(500).json({ error: "Exception requests are unavailable right now." });
        }

        const studentUserId = req.user.id;

        // Monthly quota: at most MONTHLY_REQUEST_LIMIT requests per calendar
        // month no matter the outcome (pending, approved and rejected all
        // count). This is the ONLY limit — a pending or previously rejected
        // request does NOT block a new one, so students can retry after a
        // decline or while another request is still awaiting review.
        const quotaStart = new Date();
        quotaStart.setUTCDate(1);
        quotaStart.setUTCHours(0, 0, 0, 0);
        const { count: monthCount, error: quotaError } = await supabaseAdmin
            .from("leetcode_exception_requests")
            .select("id", { count: "exact", head: true })
            .eq("student_user_id", studentUserId)
            .gte("created_at", quotaStart.toISOString());
        if (quotaError) throw quotaError;
        if ((monthCount ?? 0) >= MONTHLY_REQUEST_LIMIT) {
            return res.status(429).json({
                error: `You have already used all ${MONTHLY_REQUEST_LIMIT} exception requests this month. The limit resets on the 1st of next month.`,
                monthlyUsed: monthCount ?? MONTHLY_REQUEST_LIMIT,
                monthlyLimit: MONTHLY_REQUEST_LIMIT,
            });
        }

        // Find squad + assigned mentor for this student.
        // Squad ID is REQUIRED — students without a squad cannot request.
        let squadId = null;
        let mentorUserId = null;
        try {
            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("squad_id")
                .eq("user_id", studentUserId)
                .maybeSingle();
            squadId = profile?.squad_id ?? null;
        } catch { /* best effort */ }
        try {
            const { data: assignment } = await supabaseAdmin
                .from("squad_students")
                .select("mentor_user_id,squad_id")
                .eq("student_user_id", studentUserId)
                .maybeSingle();
            mentorUserId = assignment?.mentor_user_id ?? null;
            squadId = squadId ?? assignment?.squad_id ?? null;
        } catch { /* best effort */ }

        if (squadId === null || squadId === undefined || String(squadId).trim() === "") {
            return res.status(403).json({ error: "You must be assigned to a squad before requesting an exception. Please contact your mentor." });
        }

        // Resolve EVERY mentor linked to this student. A squad can have multiple
        // mentors (mentor_squads is squad -> mentor, so several rows can share a
        // squad_id), so collect them all: the explicit per-student roster mentor
        // (squad_students) plus every mentor who owns the student's squad
        // (mentor_squads). The first is stored as mentor_user_id (primary, keeps
        // the dashboard filter working); ALL of them are emailed so no squad
        // mentor misses the request.
        const mentorUserIds = new Set();
        if (mentorUserId) mentorUserIds.add(mentorUserId);
        const squadCandidates = [Number(squadId), String(squadId)];
        for (const candidate of squadCandidates) {
            if (candidate === null || candidate === undefined || Number.isNaN(candidate)) continue;
            try {
                const { data: squadMentors } = await supabaseAdmin
                    .from("mentor_squads")
                    .select("mentor_user_id")
                    .eq("squad_id", candidate);
                (squadMentors || []).forEach((row) => {
                    if (row?.mentor_user_id) mentorUserIds.add(row.mentor_user_id);
                });
            } catch { /* best effort */ }
        }
        const allMentorIds = [...mentorUserIds];
        // Keep the explicit roster mentor as the stored primary when present,
        // otherwise fall back to the first squad mentor so mentor_user_id is set.
        if (!mentorUserId && allMentorIds.length > 0) {
            mentorUserId = allMentorIds[0];
        }

        let { data: created, error: insertError } = await supabaseAdmin
            .from("leetcode_exception_requests")
            .insert([{
                student_user_id: studentUserId,
                mentor_user_id: mentorUserId,
                squad_id: squadId ? String(squadId) : null,
                reason,
                requested_days: requestedDays,
                status: "pending",
            }])
            .select()
            .single();
        // If the requested_days migration hasn't run yet, retry without the
        // column so requests still work (tag then falls back to 30 days).
        if (insertError && String(insertError.message || "").includes("requested_days")) {
            ({ data: created, error: insertError } = await supabaseAdmin
                .from("leetcode_exception_requests")
                .insert([{
                    student_user_id: studentUserId,
                    mentor_user_id: mentorUserId,
                    squad_id: squadId ? String(squadId) : null,
                    reason,
                    status: "pending",
                }])
                .select()
                .single());
        }
        if (insertError) throw insertError;

        // Email every mentor linked to this student's squad (fire-and-forget,
        // never blocks submit). A squad can have multiple mentors.
        notifyMentorOfExceptionRequest({ mentorUserIds: allMentorIds, studentUserId, reason, days: requestedDays, requestId: created?.id }).catch(() => {});

        return res.status(201).json({ success: true, request: created });
    } catch (err) {
        if (String(err?.message || "").includes("leetcode_exception_requests")) {
            return res.status(500).json({ error: "Exception requests table is missing. Ask an admin to run migrations/add_leetcode_exception_requests.sql" });
        }
        console.error("Exception request error:", err);
        return res.status(500).json({ error: "Failed to submit exception request: " + err.message });
    }
});

// ==========================================
// 12b. DELETE Withdraw a pending exception request (student owns it)
// Lets a student remove a request they submitted by mistake (e.g. wrong
// days / reason) — but ONLY while it is still pending. Approved / rejected
// rows are history and cannot be withdrawn; deleting the pending row also
// frees that month's quota slot so they can immediately re-submit.
// ==========================================
router.delete("/exception-request/:id", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(500).json({ error: "Exception requests are unavailable right now." });
        }
        const requestId = req.params.id;
        const studentUserId = req.user.id;
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from("leetcode_exception_requests")
            .select("id,student_user_id,status")
            .eq("id", requestId)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!existing) {
            return res.status(404).json({ error: "Request not found." });
        }
        if (existing.student_user_id !== studentUserId) {
            return res.status(403).json({ error: "You can only withdraw your own requests." });
        }
        if (existing.status !== "pending") {
            return res.status(409).json({ error: `Only pending requests can be withdrawn (this one is ${existing.status}).` });
        }
        const { error: deleteError } = await supabaseAdmin
            .from("leetcode_exception_requests")
            .delete()
            .eq("id", requestId)
            .eq("student_user_id", studentUserId);
        if (deleteError) throw deleteError;
        return res.status(200).json({ success: true, id: requestId });
    } catch (err) {
        console.error("Exception withdraw error:", err);
        return res.status(500).json({ error: "Failed to withdraw request: " + err.message });
    }
});

// ==========================================
// 13. GET My exception requests (drives the "Request accepted" tag)
// ==========================================
router.get("/exception-request", authRouteLimiter, requireAuth, requireStudent, async (req, res) => {
    try {
        if (!supabaseAdmin) return res.status(200).json({ requests: [], latest: null, hasAccepted: false, hasSquad: true, monthlyUsed: 0, monthlyLimit: MONTHLY_REQUEST_LIMIT });
        // Squad check so the frontend can disable the form upfront.
        let squadId = null;
        try {
            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("squad_id")
                .eq("user_id", req.user.id)
                .maybeSingle();
            squadId = profile?.squad_id ?? null;
        } catch { /* best effort */ }
        if (squadId === null || squadId === undefined || String(squadId).trim() === "") {
            try {
                const { data: assignment } = await supabaseAdmin
                    .from("squad_students")
                    .select("squad_id")
                    .eq("student_user_id", req.user.id)
                    .maybeSingle();
                squadId = assignment?.squad_id ?? null;
            } catch { /* best effort */ }
        }
        const hasSquad = !(squadId === null || squadId === undefined || String(squadId).trim() === "");
        const { data, error } = await supabaseAdmin
            .from("leetcode_exception_requests")
            .select("*")
            .eq("student_user_id", req.user.id)
            .order("created_at", { ascending: false })
            .limit(10);
        if (error) throw error;
        const requests = data || [];
        const latest = requests[0] || null;
        // A request is accepted while its requested_days window is open,
        // counted from mentor approval (reviewed_at). Rows without
        // requested_days (pre-migration) keep the legacy 30-day window.
        const DAY_MS = 24 * 60 * 60 * 1000;
        let acceptedUntil = null;
        let hasAccepted = false;
        for (const r of requests) {
            if (r.status !== "approved") continue;
            const days = Number(r.requested_days) || 30;
            const reviewedMs = Date.parse(r.reviewed_at || r.updated_at || r.created_at || "");
            const expiresMs = (Number.isFinite(reviewedMs) ? reviewedMs : Date.now()) + days * DAY_MS;
            if (expiresMs > Date.now()) {
                const iso = new Date(expiresMs).toISOString();
                if (!acceptedUntil || expiresMs > Date.parse(acceptedUntil)) acceptedUntil = iso;
            }
        }
        hasAccepted = !!acceptedUntil;
        // Monthly quota reporting so the form can disable itself up front
        // instead of failing on submit. Best effort: never fails the GET.
        let monthlyUsed = 0;
        try {
            const quotaStart = new Date();
            quotaStart.setUTCDate(1);
            quotaStart.setUTCHours(0, 0, 0, 0);
            const { count, error: quotaError } = await supabaseAdmin
                .from("leetcode_exception_requests")
                .select("id", { count: "exact", head: true })
                .eq("student_user_id", req.user.id)
                .gte("created_at", quotaStart.toISOString());
            if (!quotaError) monthlyUsed = count ?? 0;
        } catch { /* best effort */ }
        return res.status(200).json({
            requests,
            latest,
            hasAccepted,
            activeUntil: acceptedUntil || null,
            hasSquad,
            monthlyUsed,
            monthlyLimit: MONTHLY_REQUEST_LIMIT,
        });
    } catch (err) {
        if (String(err?.message || "").includes("leetcode_exception_requests")) {
            return res.status(200).json({ requests: [], latest: null, hasAccepted: false, hasSquad: true, monthlyUsed: 0, monthlyLimit: MONTHLY_REQUEST_LIMIT });
        }
        console.error("Exception request fetch error:", err);
        return res.status(500).json({ error: "Failed to fetch exception requests: " + err.message });
    }
});

// Fire-and-forget Brevo email(s) to EVERY mentor linked to a student's squad
// when they submit an exception request. A squad can have multiple mentors
// (mentor_squads is squad -> mentor), so we email each one individually with a
// personalized greeting. Mirrors the cron Brevo style, honours the TEST_EMAIL
// override, and never throws.
async function notifyMentorOfExceptionRequest({ mentorUserIds = [], mentorUserId, studentUserId, reason, days, requestId }) {
    try {
        if (!process.env.BREVO_API_KEY) return;
        // Accept a single mentorUserId for backward-compat, otherwise the array.
        const ids = [
            ...new Set(
                (Array.isArray(mentorUserIds) && mentorUserIds.length > 0
                    ? mentorUserIds
                    : mentorUserId
                        ? [mentorUserId]
                        : []
                ).filter(Boolean)
            ),
        ];
        if (ids.length === 0) return;

        // Resolve the submitting student's name once (shared across all emails).
        let studentName = "A student";
        try {
            const { data: sProfile } = await supabaseAdmin
                .from("profiles")
                .select("name,kalvium_email")
                .eq("user_id", studentUserId)
                .maybeSingle();
            studentName = sProfile?.name || studentName;
        } catch { /* best effort */ }

        const safe = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const testOverride = (process.env.TEST_EMAIL || "").trim();

        for (const id of ids) {
            try {
                // Resolve this mentor's email + name (auth first, profiles fallback).
                let mentorEmail = null;
                let mentorName = "Mentor";
                try {
                    const { data } = await supabaseAdmin.auth.admin.getUserById(id);
                    mentorEmail = data?.user?.email || null;
                    mentorName = data?.user?.user_metadata?.full_name || data?.user?.user_metadata?.name || "Mentor";
                } catch { /* best effort */ }
                if (!mentorEmail) {
                    try {
                        const { data: mProfile } = await supabaseAdmin
                            .from("profiles")
                            .select("kalvium_email,personal_email,name")
                            .eq("user_id", id)
                            .maybeSingle();
                        mentorEmail = mProfile?.kalvium_email || mProfile?.personal_email || null;
                        mentorName = mProfile?.name || mentorName;
                    } catch { /* best effort */ }
                }

                const recipient = testOverride || mentorEmail;
                if (!recipient) continue;

                await fetch("https://api.brevo.com/v3/smtp/email", {
                    method: "POST",
                    headers: { accept: "application/json", "content-type": "application/json", "api-key": process.env.BREVO_API_KEY },
                    body: JSON.stringify({
                        sender: { name: "Kalvium Portfolio Management", email: "kpm-squad@googlegroups.com" },
                        to: [{ email: recipient, name: mentorName }],
                        subject: "New LeetCode Exception Request",
                        htmlContent: `<div style="font-family: Arial, Helvetica, sans-serif; color: #333; font-size: 14px; line-height: 1.6;"><p>Hi ${safe(mentorName)},</p><p><strong>${safe(studentName)}</strong> submitted a LeetCode exception request for <strong>${Number(days) || 3} day${Number(days) === 1 ? "" : "s"}</strong>${requestId ? ` (ID: ${safe(requestId)})` : ""}:</p><blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#555;">${safe(reason)}</blockquote><p>Please review it under Mentor Dashboard &rarr; Exception Requests.</p><p><a href="https://kalvium-portfolio.vercel.app/mentor/dashboard/exceptions" style="display:inline-block;background-color:#dc2626;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;">Review Request</a></p><p>Best Regards,<br>Kalvium Portfolio Management</p></div>`,
                    }),
                });
            } catch (err) {
                // One mentor failing must not stop the others.
                console.warn("[EXCEPTION EMAIL] failed for mentor", id, ":", err?.message || err);
            }
        }
    } catch (err) {
        console.warn("[EXCEPTION EMAIL] failed:", err?.message || err);
    }
}

// ==========================================
// 9. GET /student/dashboard/monthly-activity?month=YYYY-MM
// Monthly consistency graph for the student's own dashboard.
// DB reads only (snapshots + approved exception overlay) — zero LeetCode calls.
// ==========================================
router.get(
    "/monthly-activity",
    authRouteLimiter,
    requireAuth,
    requireStudent,
    async (req, res) => {
        try {
            // Students read their own activity only — no cross-student access.
            const studentUserId = String(req.user.id);
            const monthParam = String(req.query?.month || "").slice(0, 7);
            const nowDate = new Date();
            const fallbackMonth = `${nowDate.getUTCFullYear()}-${String(
                nowDate.getUTCMonth() + 1
            ).padStart(2, "0")}`;
            const monthStr = /^\d{4}-\d{2}$/.test(monthParam)
                ? monthParam
                : fallbackMonth;
            const yr = Number(monthStr.slice(0, 4));
            const mo = Number(monthStr.slice(5, 7));
            if (!yr || mo < 1 || mo > 12)
                return res.status(400).json({ error: "month must be YYYY-MM" });

            const daysInMonth = new Date(Date.UTC(yr, mo, 0)).getUTCDate();
            const monthStart = `${monthStr}-01`;
            const monthEnd = `${monthStr}-${String(daysInMonth).padStart(
                2,
                "0"
            )}`;
            const istTodayStr = new Date(
                Date.now() + 5.5 * 60 * 60 * 1000
            ).toISOString().slice(0, 10);

            let snapshotByDate = {};
            try {
                const { data: rows, error: snapErr } = await supabaseAdmin
                    .from("leetcode_daily_snapshots")
                    .select(
                        "date, total_solved, solved_count, did_solve, had_exception"
                    )
                    .eq("user_id", studentUserId)
                    .gte("date", monthStart)
                    .lte("date", monthEnd);
                if (snapErr) throw snapErr;
                for (const r of rows || []) {
                    if (r?.date) snapshotByDate[r.date] = r;
                }
            } catch (snapErr) {
                if (
                    !String(snapErr.message || "").includes(
                        "leetcode_daily_snapshots"
                    )
                )
                    throw snapErr;
                snapshotByDate = {};
            }

            let windows = [];
            try {
                const { data: exRows, error: exErr } = await supabaseAdmin
                    .from("leetcode_exception_requests")
                    .select(
                        "requested_days, reviewed_at, updated_at, created_at"
                    )
                    .eq("student_user_id", studentUserId)
                    .eq("status", "approved");
                if (exErr) throw exErr;
                windows = (exRows || []).map((row) => {
                    const start = String(
                        row.reviewed_at || row.updated_at || row.created_at || ""
                    ).slice(0, 10);
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
                    const n = Number(row.requested_days) || 30;
                    const [wy, wm, wd] = start.split("-").map(Number);
                    const end = new Date(
                        Date.UTC(wy, wm - 1, wd) + (n - 1) * 86400000
                    ).toISOString().slice(0, 10);
                    return { start, end };
                }).filter(Boolean);
            } catch {
                windows = [];
            }

            // --- LeetCode monitor-session coverage for this student's squads ---
            // A day with an active monitor session counts as tracked even when
            // the student solved nothing that day.
            let studentSquadIds = [];
            try {
                const { data: ssRows, error: ssErr } = await supabaseAdmin
                    .from("squad_students")
                    .select("squad_id")
                    .eq("student_user_id", studentUserId);
                if (ssErr) throw ssErr;
                studentSquadIds = [
                    ...new Set(
                        (ssRows || [])
                            .map((r) => String(r.squad_id))
                            .filter(Boolean)
                    ),
                ];
            } catch {
                studentSquadIds = [];
            }

            const sessionDates = new Set();
            if (studentSquadIds.length > 0) {
                try {
                    const { data: sessions, error: sesErr } = await supabaseAdmin
                        .from("mentor_leetcode_sessions")
                        .select("started_at, ended_at, squad_ids");
                    if (sesErr) throw sesErr;
                    for (const s of sessions || []) {
                        const started = String(s.started_at || "").slice(0, 10);
                        const ended = String(s.ended_at || "").slice(0, 10) || null;
                        if (!started) continue;
                        const squadIds = Array.isArray(s.squad_ids)
                            ? s.squad_ids.map(String)
                            : [];
                        const hasOverlap = studentSquadIds.some((id) =>
                            squadIds.includes(id)
                        );
                        if (!hasOverlap) continue;
                        // Session covers every calendar day from started_at to
                        // ended_at (or today if still active).
                        let cursor = new Date(
                            Date.UTC(...started.split("-").map(Number))
                        );
                        const endDate = ended
                            ? new Date(Date.UTC(...ended.split("-").map(Number)))
                            : new Date();
                        while (cursor <= endDate) {
                            const ds = cursor.toISOString().slice(0, 10);
                            if (ds >= monthStart && ds <= monthEnd) {
                                sessionDates.add(ds);
                            }
                            cursor = new Date(
                                Date.UTC(
                                    cursor.getUTCFullYear(),
                                    cursor.getUTCMonth(),
                                    cursor.getUTCDate() + 1
                                )
                            );
                        }
                    }
                } catch {
                    sessionDates.clear();
                }
            }

            const days = [];
            let completedDays = 0;
            let missedDays = 0;
            let sessionDays = 0;
            let exceptionDays = 0;
            let totalSolvedThisMonth = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
                const snap = snapshotByDate[dateStr];
                const solved = Number(snap?.solved_count) || 0;
                const exc =
                    Boolean(snap?.had_exception) ||
                    windows.some((w) => w.start <= dateStr && dateStr <= w.end);
                const onSession = sessionDates.has(dateStr);
                let status;
                if (dateStr > istTodayStr) {
                    status = "future";
                } else if (exc) {
                    status = "exception";
                    exceptionDays++;
                } else if (solved > 0 || snap?.did_solve) {
                    status = "completed";
                    completedDays++;
                } else if (onSession) {
                    status = "session";
                    sessionDays++;
                } else {
                    status = "missed";
                    missedDays++;
                }
                totalSolvedThisMonth += solved;
                days.push({
                    date: dateStr,
                    day: d,
                    solved_count: solved,
                    total_solved: snap ? Number(snap.total_solved) || 0 : null,
                    has_snapshot: Boolean(snap),
                    had_exception: exc,
                    had_session: onSession,
                    status,
                });
            }

            return res.status(200).json({
                student_user_id: studentUserId,
                month: monthStr,
                summary: {
                    completedDays,
                    missedDays,
                    sessionDays,
                    exceptionDays,
                    totalSolvedThisMonth,
                    daysTracked: Object.keys(snapshotByDate).length,
                },
                days,
            });
        } catch (err) {
            console.error("[MONTHLY ACTIVITY] Failed:", err.message);
            return res.status(500).json({ error: "Failed to load monthly activity" });
        }
    }
);

export default router;