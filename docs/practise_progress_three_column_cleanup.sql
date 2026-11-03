-- Run this script only after the new frontend has been tested successfully.
-- Confirm belt_progress, topic_progress, and problem_progress contain the
-- expected data before dropping the intermediate progress column.

DO $$
BEGIN
    IF to_regclass('public.practise_progress') IS NULL THEN
        RAISE EXCEPTION 'public.practise_progress does not exist; cleanup stopped.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'practise_progress'
          AND column_name = 'belt_progress'
    ) OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'practise_progress'
          AND column_name = 'topic_progress'
    ) OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'practise_progress'
          AND column_name = 'problem_progress'
    ) THEN
        RAISE EXCEPTION
            'The three new progress columns are not present; cleanup stopped.';
    END IF;
END $$;

DO $$
DECLARE
    actual_column_count integer;
    has_legacy_progress boolean;
BEGIN
    SELECT COUNT(*)::integer
    INTO actual_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'practise_progress';

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'practise_progress'
          AND column_name = 'progress'
    )
    INTO has_legacy_progress;

    IF (has_legacy_progress AND actual_column_count <> 6)
        OR (NOT has_legacy_progress AND actual_column_count <> 5) THEN
        RAISE EXCEPTION
            'Cleanup stopped: public.practise_progress has % columns; expected 6 before dropping progress or 5 after cleanup.',
            actual_column_count;
    END IF;
END $$;

ALTER TABLE public.practise_progress
    DROP COLUMN IF EXISTS progress;

DO $$
DECLARE
    actual_column_count integer;
BEGIN
    SELECT COUNT(*)::integer
    INTO actual_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'practise_progress';

    IF actual_column_count <> 5 THEN
        RAISE EXCEPTION
            'Cleanup stopped: public.practise_progress has % columns after cleanup; expected exactly 5.',
            actual_column_count;
    END IF;
END $$;

-- The backup table is intentionally retained.
