-- Migration: Allow public read access to student achievements
--
-- Problem
-- -------
-- The `achievements` table has Row Level Security enabled with only an
-- owner-scoped SELECT policy (auth.uid() = user_id). A public portfolio
-- request uses the publishable/anon key, so RLS filters out every row and
-- PostgREST answers HTTP 200 with `[]` instead of an error. The individual
-- portfolio page therefore rendered no achievements.
--
-- `project_details` already exposes a public SELECT policy, which is why
-- public projects displayed correctly but achievements did not.
--
-- Fix
-- ---
-- Add a permissive SELECT policy so the anon role can read achievements.
-- Only these columns are ever exposed by the API, and every query in
-- backend/src/routes/public.routes.js is scoped to a specific user_id.
--
-- NOTE: backend/src/routes/public.routes.js also falls back to the
-- service-role client so the portfolio works without this migration.
-- Applying this policy lets that fallback be removed later if desired.

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view achievements" ON achievements;

CREATE POLICY "Public can view achievements"
ON achievements
FOR SELECT
TO anon, authenticated
USING (true);

-- Keep lookups by portfolio owner fast
CREATE INDEX IF NOT EXISTS idx_achievements_user_id
ON achievements(user_id);