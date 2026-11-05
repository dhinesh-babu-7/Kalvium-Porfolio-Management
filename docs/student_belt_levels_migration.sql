-- Run this script in Supabase SQL Editor after
-- docs/practise_progress_three_column_migration.sql.
-- Assessed levels belong to the student's existing practice-progress row.

DO $$
BEGIN
    IF to_regclass('public.practise_progress') IS NULL THEN
        RAISE EXCEPTION
            'public.practise_progress does not exist; run the practice progress migration first.';
    END IF;
END $$;

ALTER TABLE public.practise_progress
    ADD COLUMN IF NOT EXISTS final_belt_levels jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS final_belt_levels_updated_at timestamptz;
