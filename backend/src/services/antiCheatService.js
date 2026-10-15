/**
 * Anti-Cheat Service
 * 
 * Handles detection of suspicious leaderboard activity.
 * All detection logic is centralized here for easy testing and modification.
 */

import ANTI_CHEAT_CONFIG from "../config/antiCheatConfig.js";

/**
 * Calculate severity based on evidence
 * @param {Object} evidence - Detection evidence object
 * @returns {string} 'low', 'medium', or 'high'
 */
function calculateSeverity(evidence) {
  if (!evidence) return "low";

  const {
    difference = 0,
    scoreIncrease = 0,
    percentageIncrease = 0,
    rapidSubmissionCount = 0,
    gapSeconds = 0,
  } = evidence;

  if (rapidSubmissionCount >= 5 || percentageIncrease >= 50) {
    return "high";
  }

  if (
    rapidSubmissionCount >= 3 ||
    difference >= ANTI_CHEAT_CONFIG.severityRules.medium.rapidSolveCount ||
    scoreIncrease >= ANTI_CHEAT_CONFIG.severityRules.medium.scoreIncrease ||
    percentageIncrease >= 30
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Detect suspicious rapid submissions using actual accepted submission timestamps.
 * This is the new primary anti-cheat check requested by the mentor review requirement.
 *
 * @param {Array<Object>} submissions - Chronologically sorted accepted submissions from LeetCode
 * @returns {Object} result with suspicious boolean, severity, reason, evidence, ruleTriggered
 */
export function detectRapidSubmissions(submissions) {
  if (!Array.isArray(submissions) || submissions.length < 2) {
    return {
      suspicious: false,
      severity: "low",
      reason: "Not enough accepted submissions to evaluate.",
      evidence: { submissionCount: submissions?.length || 0 },
      ruleTriggered: null,
    };
  }

  const validSubmissions = [...submissions]
    .filter((s) => s && s.timestamp && !Number.isNaN(Number(s.timestamp)))
    .map((s) => ({
      ...s,
      timestampValue: Number(s.timestamp),
    }))
    .sort((a, b) => a.timestampValue - b.timestampValue);

  if (validSubmissions.length < 2) {
    return {
      suspicious: false,
      severity: "low",
      reason: "Not enough valid timestamps to evaluate.",
      evidence: { submissionCount: validSubmissions.length },
      ruleTriggered: null,
    };
  }

  const rapidWindows = [];
  const suspiciousPairs = [];

  for (let index = 1; index < validSubmissions.length; index++) {
    const previous = validSubmissions[index - 1];
    const current = validSubmissions[index];
    const gapSeconds = current.timestampValue - previous.timestampValue;

    if (gapSeconds >= 0 && gapSeconds <= 180) {
      rapidWindows.push({
        previous,
        current,
        gapSeconds,
      });
    }

    if (gapSeconds >= 0 && gapSeconds < 120) {
      suspiciousPairs.push({
        previous,
        current,
        gapSeconds,
        gapMinutes: gapSeconds / 60,
      });
    }
  }

  const strongRapidPattern = suspiciousPairs.length > 0;
  const multipleWithinThreeMinutes = rapidWindows.length >= 1;

  if (!strongRapidPattern && !multipleWithinThreeMinutes) {
    return {
      suspicious: false,
      severity: "low",
      reason: "No rapid submission pattern detected.",
      evidence: {
        submissionCount: validSubmissions.length,
        suspiciousPairs: 0,
        rollingWindow: 0,
      },
      ruleTriggered: null,
    };
  }

  const earliest = suspiciousPairs[0] || rapidWindows[0];
  const gapSeconds = earliest?.gapSeconds ?? 0;
  const rapidSubmissionCount = Math.max(suspiciousPairs.length, rapidWindows.length);

  let ruleTriggered = "multiple_submissions_within_3_minutes";
  let reason = "Multiple accepted submissions occurred within a short time window.";
  let severity = calculateSeverity({ gapSeconds, rapidSubmissionCount });

  if (gapSeconds < 120) {
    ruleTriggered = "submission_under_2_minutes";
    reason = `Student submitted another accepted solution only ${Math.max(1, Math.round(gapSeconds / 60))} minute(s) after the previous submission, which is under 2 minutes.`;
    severity = calculateSeverity({ gapSeconds, rapidSubmissionCount });
  } else if (rapidSubmissionCount >= 2) {
    reason = "Multiple accepted submissions occurred within 3 minutes, which is suspicious and requires mentor review.";
    severity = calculateSeverity({ gapSeconds, rapidSubmissionCount });
  }

  if (rapidSubmissionCount >= 4) {
    severity = "high";
    reason = "Repeated rapid accepted submissions indicate a highly unrealistic solving pattern.";
    ruleTriggered = "repeated_fast_submissions";
  }

  const evidence = {
    submissionCount: validSubmissions.length,
    rapidSubmissionCount,
    gapSeconds,
    gapMinutes: Number((gapSeconds / 60).toFixed(2)),
    previousSubmissionTime: earliest ? new Date(earliest.previous.timestampValue * 1000).toISOString() : null,
    currentSubmissionTime: earliest ? new Date(earliest.current.timestampValue * 1000).toISOString() : null,
    previousProblem: earliest?.previous.titleSlug || earliest?.previous.title || null,
    currentProblem: earliest?.current.titleSlug || earliest?.current.title || null,
    previousDifficulty: earliest?.previous.difficulty || null,
    currentDifficulty: earliest?.current.difficulty || null,
    windowMinutes: 3,
    submissions: validSubmissions.slice(-8).map((s) => ({
      problem: s.titleSlug || s.title || "Unknown",
      timestamp: new Date(s.timestampValue * 1000).toISOString(),
      difficulty: s.difficulty || "Unknown",
    })),
    ruleTriggered,
  };

  return {
    suspicious: true,
    severity,
    ruleTriggered,
    reason,
    evidence,
  };
}

/**
 * Detect rapid solving pattern
 * When a student solves many problems in a short time window
 * 
 * @param {Object} previous - Previous LeetCode stats snapshot
 * @param {Object} current - Current LeetCode stats
 * @param {number} timeDifferenceMinutes - Minutes since last sync
 * @returns {Object|null} Detection result or null if no suspicious activity
 */
export function detectRapidSolving(
  previous,
  current,
  timeDifferenceMinutes
) {
  if (!previous || !current) return null;

  const previousTotal = Number(previous.total_solved || 0);
  const currentTotal = Number(current.total_solved || 0);
  const difference = currentTotal - previousTotal;

  // No new problems solved
  if (difference <= 0) return null;

  // Not enough time has passed - check against configured window
  if (timeDifferenceMinutes <= 0 || timeDifferenceMinutes > ANTI_CHEAT_CONFIG.rapidSolve.windowMinutes * 2) {
    return null;
  }

  // Calculate stats for evidence
  const previousEasy = Number(previous.easy_solved || 0);
  const previousMedium = Number(previous.medium_solved || 0);
  const previousHard = Number(previous.hard_solved || 0);

  const currentEasy = Number(current.easy_solved || 0);
  const currentMedium = Number(current.medium_solved || 0);
  const currentHard = Number(current.hard_solved || 0);

  const easyDifference = currentEasy - previousEasy;
  const mediumDifference = currentMedium - previousMedium;
  const hardDifference = currentHard - previousHard;

  const previousScore = Number(previous.score || 0);
  const currentScore = Number(current.score || 0);
  const scoreIncrease = currentScore - previousScore;
  const percentageIncrease = previousScore > 0 
    ? ((scoreIncrease / previousScore) * 100)
    : 0;

  const evidence = {
    previousSolved: previousTotal,
    currentSolved: currentTotal,
    difference,
    timeDifferenceMinutes: Math.round(timeDifferenceMinutes * 10) / 10,
    easyDifference,
    mediumDifference,
    hardDifference,
    previousScore,
    currentScore,
    scoreIncrease,
    percentageIncrease: Math.round(percentageIncrease * 100) / 100,
  };

  // Check if difference exceeds thresholds
  if (difference >= ANTI_CHEAT_CONFIG.rapidSolve.highRiskThreshold) {
    const severity = calculateSeverity(evidence);
    return {
      suspicious: true,
      severity,
      flagType: "rapid_solving",
      reason: `${difference} problems were recorded within ${Math.round(timeDifferenceMinutes)} minutes.`,
      evidence,
    };
  }

  if (difference >= ANTI_CHEAT_CONFIG.rapidSolve.warningThreshold) {
    const severity = calculateSeverity(evidence);
    return {
      suspicious: true,
      severity,
      flagType: "rapid_solving",
      reason: `${difference} problems were recorded within ${Math.round(timeDifferenceMinutes)} minutes. Unusual solving pattern detected.`,
      evidence,
    };
  }

  return null;
}

/**
 * Detect score spike pattern
 * When score increases by an unusually large percentage
 * 
 * @param {Object} previous - Previous LeetCode stats snapshot
 * @param {Object} current - Current LeetCode stats
 * @returns {Object|null} Detection result or null if no suspicious activity
 */
export function detectScoreSpike(previous, current) {
  if (!previous || !current) return null;

  const previousScore = Number(previous.score || 0);
  const currentScore = Number(current.score || 0);

  if (previousScore === 0 || currentScore <= previousScore) {
    return null;
  }

  const scoreIncrease = currentScore - previousScore;
  const percentageIncrease = (scoreIncrease / previousScore) * 100;

  if (
    percentageIncrease >=
    ANTI_CHEAT_CONFIG.scoreSpike.percentageThreshold
  ) {
    const evidence = {
      previousScore,
      currentScore,
      scoreIncrease,
      percentageIncrease: Math.round(percentageIncrease * 100) / 100,
    };

    const severity = calculateSeverity(evidence);

    return {
      suspicious: true,
      severity,
      flagType: "score_spike",
      reason: `Score increased by ${Math.round(percentageIncrease)}% (${scoreIncrease} points) since last sync.`,
      evidence,
    };
  }

  return null;
}

/**
 * Detect difficulty spike pattern
 * When solving pattern deviates significantly from normal
 * 
 * @param {Object} previous - Previous LeetCode stats snapshot
 * @param {Object} current - Current LeetCode stats
 * @returns {Object|null} Detection result or null if no suspicious activity
 */
export function detectDifficultySpike(previous, current) {
  if (
    !ANTI_CHEAT_CONFIG.difficultySpikeDetection.enabled ||
    !previous ||
    !current
  ) {
    return null;
  }

  const previousHard = Number(previous.hard_solved || 0);
  const currentHard = Number(current.hard_solved || 0);
  const hardDifference = currentHard - previousHard;

  // Check for unusually high hard problem count in one sync
  if (
    hardDifference >
    ANTI_CHEAT_CONFIG.difficultySpikeDetection.hardProblemThreshold
  ) {
    const evidence = {
      hardDifference,
      previousHard,
      currentHard,
      totalSyncedProblems:
        (Number(current.easy_solved) - Number(previous.easy_solved || 0)) +
        (Number(current.medium_solved) - Number(previous.medium_solved || 0)) +
        hardDifference,
    };

    return {
      suspicious: true,
      severity: "medium",
      flagType: "suspicious_submission_pattern",
      reason: `Unusual difficulty distribution: ${hardDifference} hard problems solved in this sync.`,
      evidence,
    };
  }

  return null;
}

/**
 * Run comprehensive anti-cheat checks
 * 
 * @param {Object} previous - Previous LeetCode stats snapshot
 * @param {Object} current - Current LeetCode stats
 * @param {number} timeDifferenceMinutes - Minutes since last sync
 * @returns {Array} Array of detection results (can contain multiple flags)
 */
export function runAntiCheatChecks(
  previous,
  current,
  timeDifferenceMinutes,
  rapidSubmissionData = null
) {
  if (!ANTI_CHEAT_CONFIG.enabled) {
    return [];
  }

  const detections = [];

  if (rapidSubmissionData) {
    const rapidSubmissionCheck = detectRapidSubmissions(rapidSubmissionData);
    if (rapidSubmissionCheck?.suspicious) {
      detections.push({
        suspicious: true,
        severity: rapidSubmissionCheck.severity,
        flagType: "rapid_solving",
        reason: rapidSubmissionCheck.reason,
        evidence: rapidSubmissionCheck.evidence,
      });
    }
  }

  const rapidSolveDetection = detectRapidSolving(
    previous,
    current,
    timeDifferenceMinutes
  );
  if (rapidSolveDetection?.suspicious) {
    detections.push(rapidSolveDetection);
  }

  const scoreSpike = detectScoreSpike(previous, current);
  if (scoreSpike?.suspicious) {
    detections.push(scoreSpike);
  }

  const difficultySpikeDetection = detectDifficultySpike(
    previous,
    current
  );
  if (difficultySpikeDetection?.suspicious) {
    detections.push(difficultySpikeDetection);
  }

  return detections;
}

/**
 * Format detection results for flag creation
 * 
 * @param {Object} detection - A single detection result from runAntiCheatChecks
 * @param {string} studentId - UUID of the student
 * @param {string} studentName - Name of the student
 * @param {string} leetcodeUsername - LeetCode username
 * @returns {Object} Formatted flag object for database insertion
 */
export function formatDetectionAsFlag(
  detection,
  studentId,
  studentName,
  leetcodeUsername
) {
  return {
    student_id: studentId,
    student_name: studentName,
    leetcode_username: leetcodeUsername,
    flag_type: detection.flagType,
    reason: detection.reason,
    severity: detection.severity,
    detected_at: new Date().toISOString(),
    evidence: JSON.stringify(detection.evidence),
    status: "pending",
  };
}

export default {
  detectRapidSolving,
  detectRapidSubmissions,
  detectScoreSpike,
  detectDifficultySpike,
  runAntiCheatChecks,
  formatDetectionAsFlag,
};
