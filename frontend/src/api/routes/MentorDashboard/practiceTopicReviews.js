import apiClient from "../../config/app";
import jwt from "../../Helpers/jwt";

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function getPracticeTopicReviewCount() {
  const token = await jwt();
  if (!token) throw new Error("No active session found. Please sign in again.");
  const response = await apiClient.get(
    "/mentor/dashboard/practice-topic-reviews/count",
    authHeaders(token)
  );
  return response.data?.pendingCount ?? 0;
}

export async function getPracticeTopicReviews() {
  const token = await jwt();
  if (!token) throw new Error("No active session found. Please sign in again.");
  const response = await apiClient.get(
    "/mentor/dashboard/practice-topic-reviews",
    authHeaders(token)
  );
  return {
    requests: response.data?.requests || [],
    assignedStudentCount: response.data?.assignedStudentCount ?? 0,
  };
}

export async function decidePracticeTopicReview(id, decision, mentorNote = "") {
  const token = await jwt();
  if (!token) throw new Error("No active session found. Please sign in again.");
  const response = await apiClient.patch(
    `/mentor/dashboard/practice-topic-reviews/${encodeURIComponent(id)}`,
    { decision, mentor_note: mentorNote },
    authHeaders(token)
  );
  return response.data?.review;
}

export async function importStudentBeltLevels(rows) {
  const token = await jwt();
  if (!token) throw new Error("No active session found. Please sign in again.");
  const response = await apiClient.post(
    "/mentor/dashboard/practice-topic-reviews/belt-levels/import",
    { rows },
    authHeaders(token)
  );
  return response.data;
}
