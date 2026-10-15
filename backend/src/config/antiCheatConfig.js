/**
 * Anti-Cheat System Configuration
 * 
 * All thresholds and detection rules are defined here for easy customization.
 * Modify these values to adjust the sensitivity of the anti-cheat system.
 */

export const ANTI_CHEAT_CONFIG = {
  // Enable/disable the entire anti-cheat system
  enabled: true,

  // Rapid solving detection
  // Detects when a student solves too many problems in a short time window
  rapidSolve: {
    // Time window in minutes to look for rapid solves
    windowMinutes: 30,
    
    // Number of problems that triggers a warning-level flag
    warningThreshold: 8,
    
    // Number of problems that triggers a high-risk flag
    highRiskThreshold: 15,
  },

  // Score spike detection
  // Detects when score increases by an unusually large percentage
  scoreSpike: {
    // Percentage increase that triggers detection (0-100)
    // e.g., 40 = 40% increase
    percentageThreshold: 40,
  },

  // Problem difficulty spike detection
  // Detects when solving pattern deviates from normal
  difficultySpikeDetection: {
    // Enable difficulty spike detection
    enabled: true,
    
    // Threshold for hard problems in a single sync
    hardProblemThreshold: 10,
  },

  // Duplicate flag protection
  // Prevents spamming mentors with the same flag multiple times
  duplicateProtection: {
    // How many hours to consider flags as "duplicate" of the same event
    // Set to 0 to disable duplicate protection
    timeLookbackHours: 24,
  },

  // Severity levels based on evidence
  severityRules: {
    // High severity: Many problems in very short time
    high: {
      rapidSolveCount: 15,
      scoreIncrease: 50,
    },
    // Medium severity: Moderate rapid solving
    medium: {
      rapidSolveCount: 8,
      scoreIncrease: 30,
    },
    // Low severity: Minor suspicious pattern
    low: {
      rapidSolveCount: 5,
      scoreIncrease: 15,
    },
  },
};

export default ANTI_CHEAT_CONFIG;
