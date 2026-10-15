import apiClient from "../../config/app";
import jwt from "../../Helpers/jwt";

/**
 * Fetch anti-cheat flags for the mentor's students
 */
export async function getAntiCheatFlags(filters = {}) {
  const token = await jwt();
  if (!token) return null;

  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.severity) params.append("severity", filters.severity);
    if (filters.search) params.append("search", filters.search);

    const response = await apiClient.get(
      `/mentor/dashboard/anti-cheat/flags?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error fetching anti-cheat flags:",
      error.response?.data || error.message
    );
    return null;
  }
}

/**
 * Fetch detailed information for a specific anti-cheat flag
 */
export async function getAntiCheatFlagDetails(studentUserId) {
  const token = await jwt();
  if (!token) return null;

  try {
    const response = await apiClient.get(
      `/mentor/dashboard/anti-cheat/flags/${studentUserId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error fetching flag details:",
      error.response?.data || error.message
    );
    return null;
  }
}

/**
 * Clear an anti-cheat flag (mark as false alarm)
 */
export async function clearAntiCheatFlag(studentUserId, note = "") {
  const token = await jwt();
  if (!token) return null;

  try {
    const response = await apiClient.patch(
      `/mentor/dashboard/anti-cheat/flags/${studentUserId}/clear`,
      { note },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error clearing flag:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * Confirm an anti-cheat violation
 */
export async function confirmAntiCheatViolation(studentUserId, note = "") {
  const token = await jwt();
  if (!token) return null;

  try {
    const response = await apiClient.patch(
      `/mentor/dashboard/anti-cheat/flags/${studentUserId}/confirm`,
      { note },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error confirming violation:",
      error.response?.data || error.message
    );
    throw error;
  }
}
