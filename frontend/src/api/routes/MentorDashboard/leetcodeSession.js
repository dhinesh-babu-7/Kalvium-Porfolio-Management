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

export async function updateLeetcodeSession() {
    const token = await jwt();
    if (token === null) return { active: false, message: "No active session" };
    try {
        const response = await apiClient.get("/mentor/dashboard/leetcode-session/update", {
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating session:", error);
        if (error.response && error.response.status === 429) {
            return { active: false, message: "Rate limited: Please wait 30 seconds" };
        }
        return { active: false, message: "Failed to update session" };
    }
}