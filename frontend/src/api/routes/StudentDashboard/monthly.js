import apiClient from "../../config/app";
import jwt from "../../Helpers/jwt";

// ==========================================
// STUDENT MONTHLY ACTIVITY (own dashboard)
// ==========================================

/**
 * Fetches the signed-in student's monthly consistency activity for YYYY-MM.
 * Reads daily snapshots + approved exception overlay — zero LeetCode calls.
 * @param {string} month "2026-10"
 */
export async function getMyMonthlyActivity(month) {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return null;
  }

  try {
    const response = await apiClient.get("/student/dashboard/monthly-activity", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: month ? { month } : {},
    });
    return response.data || null;
  } catch (error) {
    console.error(
      "Error fetching my monthly activity:",
      error?.response?.data || error.message
    );
    return null;
  }
}
