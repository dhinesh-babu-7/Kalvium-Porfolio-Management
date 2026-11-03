-- Run this script only after reviewing it in the Supabase SQL Editor.
-- It repairs the six legacy topic IDs left in the old progress JSONB after
-- practise_progress_three_column_migration.sql has already run.
--
-- Historical mapping verified from Git:
--   b1-variables, b1-assignment, b1-data-types, b1-input-output, and
--   b1-type-conversion -> b1-variables-assignment-data-types
--   b2-arithmetic -> b1-operators-precedence
--
-- The historical records contain natural-language exercises rather than
-- stable problem IDs. Their numeric solvedProblems indexes are intentionally
-- not guessed or converted. The old progress column remains available for
-- audit, and existing problem_progress values are preserved.

DO $$
DECLARE
    required_column text;
BEGIN
    IF to_regclass('public.practise_progress') IS NULL THEN
        RAISE EXCEPTION
            'public.practise_progress does not exist; repair stopped.';
    END IF;

    FOREACH required_column IN ARRAY ARRAY[
        'user_id',
        'progress',
        'belt_progress',
        'topic_progress',
        'problem_progress',
        'updated_at'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'practise_progress'
              AND column_name = required_column
        ) THEN
            RAISE EXCEPTION
                'Required column % is missing from public.practise_progress; repair stopped.',
                required_column;
        END IF;
    END LOOP;

    IF to_regprocedure('public.calculate_belt_progress(jsonb)') IS NULL THEN
        RAISE EXCEPTION
            'public.calculate_belt_progress(jsonb) is missing; repair stopped.';
    END IF;
END $$;

WITH legacy_entries AS (
    SELECT
        p.user_id,
        entry.key AS legacy_topic_id,
        entry.value AS legacy_topic
    FROM public.practise_progress AS p
    CROSS JOIN LATERAL jsonb_each(
        CASE
            WHEN jsonb_typeof(p.progress) = 'object'
                THEN p.progress
            ELSE '{}'::jsonb
        END
    ) AS entry
    WHERE entry.key IN (
        'b1-variables',
        'b1-assignment',
        'b1-data-types',
        'b1-input-output',
        'b1-type-conversion',
        'b2-arithmetic'
    )
),
legacy_topic_values AS (
    SELECT
        user_id,
        CASE
            WHEN legacy_topic_id IN (
                'b1-variables',
                'b1-assignment',
                'b1-data-types',
                'b1-input-output',
                'b1-type-conversion'
            ) THEN 'b1-variables-assignment-data-types'
            WHEN legacy_topic_id = 'b2-arithmetic'
                THEN 'b1-operators-precedence'
        END AS topic_id,
        COALESCE((legacy_topic->>'learned')::boolean, false) AS learned,
        false AS completed
    FROM legacy_entries
),
legacy_topics AS (
    SELECT
        user_id,
        topic_id,
        bool_or(learned) AS learned,
        false AS completed
    FROM legacy_topic_values
    GROUP BY user_id, topic_id
),
legacy_topic_json AS (
    SELECT
        user_id,
        jsonb_object_agg(
            topic_id,
            jsonb_build_object(
                'learned', learned,
                'completed', completed
            )
        ) AS topic_progress
    FROM legacy_topics
    GROUP BY user_id
)
UPDATE public.practise_progress AS target
SET
    topic_progress = legacy_topic_json.topic_progress
        || COALESCE(target.topic_progress, '{}'::jsonb),
    belt_progress = public.calculate_belt_progress(
        legacy_topic_json.topic_progress
            || COALESCE(target.topic_progress, '{}'::jsonb)
    ),
    updated_at = now()
FROM legacy_topic_json
WHERE target.user_id = legacy_topic_json.user_id;

-- This repair intentionally does not alter problem_progress:
-- the six legacy solvedProblems arrays contain numeric indexes for
-- natural-language exercises, not verified IDs from the current 37-topic
-- mapping. Existing database problem statuses remain authoritative.
