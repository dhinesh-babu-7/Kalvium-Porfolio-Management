import apiClient from "../../config/app";
import jwt from "../../Helpers/jwt";

// ==========================================
// GET MENTOR REVIEW QUEUE
// ==========================================

export async function getMentorReviewQueue() {
  const token = await jwt();

  if (!token) {
    console.error("No active session found");
    return { reviews: [] };
  }

  try {
    const response = await apiClient.get(
      "/mentor/dashboard/leetcode-review/queue",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error fetching mentor review queue:",
      error.response?.data || error.message,
    );

    throw error;
  }
}

// ==========================================
// APPROVE MENTOR REVIEW
// ==========================================

export async function approveMentorReview(studentUserId) {
  const token = await jwt();

  if (!token) {
    console.error("No active session found");
    return null;
  }

  if (!studentUserId) {
    throw new Error("Student user ID is required");
  }

  try {
    const response = await apiClient.patch(
      `/mentor/dashboard/leetcode-review/${studentUserId}/approve`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error approving mentor review:",
      error.response?.data || error.message,
    );

    throw error;
  }
}

// ==========================================
// REJECT MENTOR REVIEW
// ==========================================

export async function rejectMentorReview(studentUserId) {
  const token = await jwt();

  if (!token) {
    console.error("No active session found");
    return null;
  }

  if (!studentUserId) {
    throw new Error("Student user ID is required");
  }

  try {
    const response = await apiClient.patch(
      `/mentor/dashboard/leetcode-review/${studentUserId}/reject`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error rejecting mentor review:",
      error.response?.data || error.message,
    );

    throw error;
  }
}
