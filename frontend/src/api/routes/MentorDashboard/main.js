import apiClient from "../../config/app";
import jwt from "../../Helpers/jwt";

// ==========================================
// SQUAD MANAGEMENT
// ==========================================

export async function getsquadsOverview() {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return { squads: [], count: 0 };
  }

  try {
    const response = await apiClient.get("/mentor/dashboard/getsquadsOverview", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      squads: response.data.squads || [],
      count: response.data.count || 0,
    };
  } catch (error) {
    console.error("Error fetching squads overview:", error);
    throw error;
  }
}

export async function getSquads() {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return { squads: [], count: 0 };
  }

  try {
    const response = await apiClient.get("/mentor/dashboard/getsquads", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      squads: response.data.squads || [],
      count: response.data.count || 0,
    };
  } catch (error) {
    console.error("Error fetching squads:", error);
    throw error;
  }
}

export async function saveSquad(squads) {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return;
  }

  try {
    const response = await apiClient.post(
      "/mentor/dashboard/savesquad",
      { squads },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error saving squad:", error);
    throw error;
  }
}

// ==========================================
// STUDENT MANAGEMENT & STATS
// ==========================================

export async function getStudents(squadId = null) {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return { students: [], count: 0 };
  }

  try {
    const response = await apiClient.get("/mentor/dashboard/students", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: squadId ? { squad_id: squadId } : {},
    });

    return {
      students: response.data.students || [],
      count: response.data.count || 0,
    };
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
}

export async function getAssignedStudents() {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return { students: [], count: 0 };
  }

  try {
    const response = await apiClient.get("/mentor/dashboard/assigned-students", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      students: response.data.students || [],
      count: response.data.count || 0,
    };
  } catch (error) {
    console.error("Error fetching assigned students:", error);
    throw error;
  }
}

/**
 * Fetches detailed stats/activity breakdown for a specific student.
 * @param {string|number} studentUserId
 */
export async function getStudentStats(studentUserId) {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return null;
  }

  try {
    const response = await apiClient.get(
      `/mentor/dashboard/student-stats/${studentUserId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.student || null;
  } catch (error) {
    console.error(`Error fetching stats for student ${studentUserId}:`, error);
    throw error;
  }
}

export async function assignStudent(studentUserId, squadId) {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return;
  }

  try {
    const response = await apiClient.post(
      "/mentor/dashboard/assign-student",
      { student_user_id: studentUserId, squad_id: squadId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error assigning student:", error);
    throw error;
  }
}

export async function unassignStudent(studentUserId) {
  const token = await jwt();
  if (!token) {
    console.error("No active session found");
    return;
  }

  try {
    const response = await apiClient.post(
      "/mentor/dashboard/unassign-student",
      { student_user_id: studentUserId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error unassigning student:", error);
    throw error;
  }
}

// ==========================================
// BULK ACTIONS
// ==========================================

/**
 * Assigns an array of students to a squad in parallel execution.
 * @param {Array<{student_user_id: string|number, squad_id: string|number}>} studentList
 */
export async function assignBulkStudents(studentList) {
  if (!Array.isArray(studentList) || studentList.length === 0) return [];

  try {
    const assignPromises = studentList.map((item) =>
      assignStudent(item.student_user_id || item.id, item.squad_id)
    );
    return await Promise.all(assignPromises);
  } catch (error) {
    console.error("Error in bulk assigning students:", error);
    throw error;
  }
}

/**
 * Unassigns multiple students simultaneously.
 * @param {Array<string|number>} studentUserIds
 */
export async function unassignBulkStudents(studentUserIds) {
  if (!Array.isArray(studentUserIds) || studentUserIds.length === 0) return [];

  try {
    const unassignPromises = studentUserIds.map((id) => unassignStudent(id));
    return await Promise.all(unassignPromises);
  } catch (error) {
    console.error("Error in bulk unassigning students:", error);
    throw error;
  }
}