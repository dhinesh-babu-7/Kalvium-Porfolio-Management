import jwt from "../../Helpers/jwt";
import apiClient from "../../config/app";

export async function getLeetcodeSession() {
    const token = await jwt();
    if (token === null) return { active: false, session: null, students: [] };
    try {
        const response = await apiClient.get("/mentor/dashboard/leetcode-session", {
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching session:", error);
        return { active: false, session: null, students: [] };
    }
}

export async function startLeetcodeSession(squadIds) {
    const token = await jwt();
    if (token === null) return null;
    try {
        const response = await apiClient.post("/mentor/dashboard/leetcode-session/start", { squad_ids: squadIds }, {
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        return response.data;
    } catch (error) {
        console.error("Error starting session:", error);
        return null;
    }
}

export async function endLeetcodeSession() {
    const token = await jwt();
    if (token === null) return null;
    try {
        const response = await apiClient.post("/mentor/dashboard/leetcode-session/end", {}, {
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        return response.data;
    } catch (error) {
        console.error("Error ending session:", error);
        return null;
    }
}

export async function getLeetcodeSessionReports(scope = "last5") {
    const token = await jwt();
    if (token === null) return { scope, reports: [] };
    try {
        const response = await apiClient.get("/mentor/dashboard/leetcode-session/reports", {
            params: { scope },
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching session reports:", error);
        return { scope, reports: [], error: "Failed to load session reports" };
    }
}

export function isRateLimitedError(error) {
    return error?.response?.status === 429;
}

function getRetryAfterSeconds(error, fallbackSeconds) {
    const headerValue =
        error?.response?.headers?.["retry-after"] ??
        error?.response?.headers?.["Retry-After"];
    const parsed = Number(headerValue);
    if (Number.isFinite(parsed) && parsed > 0) return Math.ceil(parsed);
    return fallbackSeconds;
}

export async function updateLeetcodeSession({ retryAfterSeconds = 45 } = {}) {
    const token = await jwt();
    if (token === null) return { active: false, message: "No active session" };
    try {
        const response = await apiClient.get("/mentor/dashboard/leetcode-session/update", {
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating session:", error);
        if (isRateLimitedError(error)) {
            return {
                active: false,
                message: "Refresh throttled by server — retrying automatically",
                rateLimited: true,
                retryable: true,
                retryAfterSeconds: getRetryAfterSeconds(error, retryAfterSeconds),
            };
        }
        const status = error?.response?.status;
        const retryable = status === undefined || status === 0 || (status >= 500 && status < 600);
        return {
            active: false,
            message: "Failed to update session",
            retryable,
            retryAfterSeconds: retryAfterSeconds,
        };
    }
}