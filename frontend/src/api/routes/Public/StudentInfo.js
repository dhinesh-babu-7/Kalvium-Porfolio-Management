import apiClient from "../../config/app";

// Fetches the list of all students
export const getAllStudents = async () => {
  const response = await apiClient.get('/public/profiles');
  return response.data;
};

export const getFeaturedStudents = async () => {
  const response = await apiClient.get("/public/profiles/featured");
  return response.data;
};

// Fetches a single student by their user_id
export const getStudentByUserId = async (userId) => {
  const response = await apiClient.get(`/public/profiles/${userId}`);
  return response.data;
};

// Fetches a student's public projects
export const getStudentProjects = async (userId) => {
  const response = await apiClient.get(`/public/profiles/${userId}/projects`);
  return response.data;
};

// Fetches a single public project by ID
export const getStudentProjectById = async (userId, projectId) => {
  const response = await apiClient.get(`/public/profiles/${userId}/projects/${projectId}`);
  return response.data;
};

// Fetches a student's public achievements
export const getStudentAchievements = async (userId) => {
  const response = await apiClient.get(`/public/profiles/${userId}/achievements`);
  return response.data;
};

// Fetches GitHub Stats
export const getGithubStats = async (url) => {
  const response = await apiClient.post('/public/github', { url });
  return response.data;
};

// Fetches LeetCode Stats
export const getLeetcodeStats = async (url) => {
  const response = await apiClient.post('/public/leetcode', { url });
  return response.data;
};