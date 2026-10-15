-- Migration: Add Anti-Cheat System
-- This migration adds comprehensive anti-cheat detection and tracking tables

-- ============================================================
-- TABLE: anti_cheat_flags
-- ============================================================
-- Tracks suspicious activity detected by the anti-cheat system
-- Mentors review these flags and clear or confirm violations
-- ============================================================

CREATE TABLE IF NOT EXISTS anti_cheat_flags (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  leetcode_username TEXT NOT NULL,
  
  -- Flag details
  flag_type TEXT NOT NULL CHECK (flag_type IN ('rapid_solving', 'score_spike', 'suspicious_submission_pattern', 'manual_flag')),
  reason TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  
  -- Detection info
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  evidence JSONB,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'confirmed')),
  previous_rank INTEGER,
  
  -- Mentor review
  mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mentor_note TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_student_id ON anti_cheat_flags(student_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_status ON anti_cheat_flags(status);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_severity ON anti_cheat_flags(severity);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_detected_at ON anti_cheat_flags(detected_at);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_student_status ON anti_cheat_flags(student_id, status);

-- Add comments
COMMENT ON TABLE anti_cheat_flags IS 'Tracks suspicious leaderboard activity detected by the anti-cheat system. Mentors review and clear or confirm these flags.';
COMMENT ON COLUMN anti_cheat_flags.flag_type IS 'Type of suspicious activity: rapid_solving, score_spike, suspicious_submission_pattern, manual_flag';
COMMENT ON COLUMN anti_cheat_flags.severity IS 'Risk level: low, medium, high';
COMMENT ON COLUMN anti_cheat_flags.status IS 'Review status: pending (awaiting mentor), cleared (false alarm), confirmed (violation confirmed)';
COMMENT ON COLUMN anti_cheat_flags.evidence IS 'JSON object containing detection evidence, e.g. {previousSolved: 120, currentSolved: 146, timeDifferenceMinutes: 15, ...}';

-- ============================================================
-- TABLE: leetcode_sync_history
-- ============================================================
-- Stores historical snapshots of LeetCode stats for each sync
-- Used to detect suspicious patterns and score spikes
-- ============================================================

CREATE TABLE IF NOT EXISTS leetcode_sync_history (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leetcode_username TEXT NOT NULL,
  
  -- Problem counts
  easy_solved INTEGER NOT NULL DEFAULT 0,
  medium_solved INTEGER NOT NULL DEFAULT 0,
  hard_solved INTEGER NOT NULL DEFAULT 0,
  total_solved INTEGER NOT NULL DEFAULT 0,
  
  -- Score
  score INTEGER NOT NULL DEFAULT 0,
  
  -- LeetCode profile ranking
  leetcode_ranking INTEGER,
  
  -- Sync timestamp
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_leetcode_sync_history_student_id ON leetcode_sync_history(student_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_sync_history_synced_at ON leetcode_sync_history(synced_at);
CREATE INDEX IF NOT EXISTS idx_leetcode_sync_history_student_synced ON leetcode_sync_history(student_id, synced_at DESC);

-- Add comments
COMMENT ON TABLE leetcode_sync_history IS 'Historical snapshots of LeetCode statistics. Used to detect suspicious patterns and score spikes between syncs.';
COMMENT ON COLUMN leetcode_sync_history.synced_at IS 'Timestamp when LeetCode data was synchronized';

-- ============================================================
-- TABLE: anti_cheat_sync_events
-- ============================================================
-- Tracks what was checked during each anti-cheat scan
-- Prevents duplicate flag creation for the same event
-- ============================================================

CREATE TABLE IF NOT EXISTS anti_cheat_sync_events (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_event_key TEXT NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_sync_event UNIQUE(student_id, sync_event_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_anti_cheat_sync_events_student ON anti_cheat_sync_events(student_id);

-- Add comments
COMMENT ON TABLE anti_cheat_sync_events IS 'Tracks anti-cheat checks to prevent duplicate flag creation for the same sync event.';
COMMENT ON COLUMN anti_cheat_sync_events.sync_event_key IS 'Unique identifier for a specific check (e.g., student_id + synced_at)';
