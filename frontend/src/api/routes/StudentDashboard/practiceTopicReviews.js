import apiClient from "../../config/app";
import jwt from "../../Helpers/jwt";

export async function getStudentPracticeTopicReviews() {
  const token = await jwt();
  if (!token) throw new Error("No active session found. Please sign in again.");

  const response = await apiClient.get("/student/dashboard/practice-topic-reviews", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data?.reviews || [];
}

export async function submitPracticeTopicForReview(beltId, topicId) {
  const token = await jwt();
  if (!token) throw new Error("No active session found. Please sign in again.");

  const response = await apiClient.post(
    "/student/dashboard/practice-topic-reviews",
    { belt_id: beltId, topic_id: topicId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data?.review;
}
