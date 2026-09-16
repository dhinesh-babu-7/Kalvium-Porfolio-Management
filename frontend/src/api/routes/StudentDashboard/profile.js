import jwt from "../../Helpers/jwt";
import apiClient from "../../config/app";

export async function getProfile() {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return;
    }

    try {
        const response = await apiClient.get("/student/dashboard/profile", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data; 
    } catch (error) {
        console.error("Error fetching profile:", error);
        throw error;
    }
}

export async function updateProfile(params) {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return;
    }

    try {
        const response = await apiClient.put("/student/dashboard/updateprofile", params, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
}

export async function getProjects() {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return [];
    }

    try {
        const response = await apiClient.get("/student/dashboard/projects", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data || [];
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
}

export async function createProject(params) {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return null;
    }

    try {
        const response = await apiClient.post("/student/dashboard/projects", params, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error creating project:", error);
        return null;
    }
}

export async function updateProject(params) {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return null;
    }

    try {
        const response = await apiClient.put("/student/dashboard/projects", params, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error updating project:", error);
        return null;
    }
}

export async function deleteProject(projectId) {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return false;
    }

    try {
        const response = await apiClient.delete(`/student/dashboard/projects/${projectId}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error deleting project:", error);
        return false;
    }
}

// ==========================================
// GET Achievements from achievements table
// ==========================================
export async function getAchievements() {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return [];
    }

    try {
        const response = await apiClient.get("/student/dashboard/achievements", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data || [];
    } catch (error) {
        console.error("Error fetching achievements:", error);
        return [];
    }
}

// ==========================================
// POST Add a new achievement
// ==========================================
export async function createAchievement(params) {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return null;
    }

    try {
        const response = await apiClient.post("/student/dashboard/achievements", params, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error creating achievement:", error);
        return null;
    }
}

// ==========================================
// DELETE an achievement
// ==========================================
export async function deleteAchievement(achievementId) {
    const token = await jwt();

    if (!token) {
        console.error("No active session found");
        return false;
    }

    try {
        const response = await apiClient.delete(`/student/dashboard/achievements/${achievementId}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error deleting achievement:", error);
        return false;
    }
}