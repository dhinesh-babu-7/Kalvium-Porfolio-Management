-- Run after practise_progress_three_column_migration.sql in the Supabase SQL
-- Editor. Existing completed topics are retained as previously approved.

BEGIN;

CREATE OR REPLACE FUNCTION public.practice_topic_order(p_belt_id integer)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE p_belt_id
        WHEN 1 THEN ARRAY[
            'b1-variables-assignment-data-types',
            'b1-variable-scope-debugging',
            'b1-operators-precedence',
            'b1-input-output-and-formatted-output',
            'b1-boolean-conditions',
            'b1-functions-parameters-return-values-and-pass-by-value-reference',
            'b1-basic-debugging-and-tracing-syntax-runtime-and-logical-errors'
        ]
        WHEN 2 THEN ARRAY[
            'b2-for-while-do-while',
            'b2-break-continue-sentinel-loops',
            'b2-nested-loops-pattern-iteration',
            'b2-basic-mathematics-gcd-lcm-primes-and-sieve-of-eratosthenes',
            'b2-digit-problems-modular-arithmetic-fast-exponentiation-and-fractions',
            'b2-complexity-o-1-o-n-o-n-and-the-cost-of-nested-loops'
        ]
        WHEN 3 THEN ARRAY[
            'b3-arrays-crud-indexing-bounds-and-traversal',
            'b3-array-operations-insertion-deletion-by-shifting-reverse-rotate-merge-sorted-arrays-and-rearrangement',
            'b3-strings-crud-substrings-comparison-palindrome-anagram-reversal-and-basic-compression',
            'b3-matrices-2d-arrays',
            'b3-frequency-hash-map',
            'b3-time-growth-complexity'
        ]
        WHEN 4 THEN ARRAY[
            'b4-subarrays-and-subsequences-generation-and-subarray-sum-problems',
            'b4-prefix-suffix-sums-and-prefix-xor-pivot-index-and-product-except-self',
            'b4-hashing-counting-lookup-two-sum-subarray-sum-k-and-group-anagrams',
            'b4-kadanes-algorithm',
            'b4-sliding-window',
            'b4-basic-sorting',
            'b4-two-pointers-opposite-ends-same-direction-and-three-sum',
            'b4-binary-search-lower-upper-bound-rotated-arrays-2d-matrices-and-peak-element',
            'b4-counting-sort-and-radix-sort-non-comparison-sorting'
        ]
        WHEN 5 THEN ARRAY[
            'b5-singly-linked-lists',
            'b5-doubly-circular-linked-lists',
            'b5-linked-list-problem-solving-reverse-middle-node-and-merge-sorted-lists',
            'b5-stacks',
            'b5-queues',
            'b5-deque-operations-and-sliding-window-maximum',
            'b5-monotonic-stack',
            'b5-hare-tortoise'
        ]
        WHEN 6 THEN ARRAY[
            'b6-recursion-fundamentals',
            'b6-recursion-tree-stack-depth',
            'b6-divide-and-conquer-merge-sort-quick-sort-and-quickselect',
            'b6-backtracking-fundamentals',
            'b6-subsets-subsequences-power-set',
            'b6-permutations-duplicate-handling',
            'b6-constraint-based-search-word-search-n-queens-sudoku-and-rat-in-a-maze'
        ]
        WHEN 7 THEN ARRAY[
            'b7-binary-search-answer-space',
            'b7-greedy-algorithms',
            'b7-greedy-applications-activity-selection-interval-scheduling-job-sequencing-and-jump-game',
            'b7-when-greedy-fails-0-1-knapsack-coin-change-and-longest-increasing-subsequence',
            'b7-choosing-the-right-approach-binary-search-on-answer-space-vs-greedy-vs-dynamic-programming'
        ]
        ELSE ARRAY[]::text[]
    END;
$$;

CREATE TABLE IF NOT EXISTS public.practice_topic_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    belt_id integer NOT NULL CHECK (belt_id BETWEEN 1 AND 7),
    topic_id text NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    mentor_note text,
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    CHECK (
        topic_id ~ '^b[1-7]-'
        AND substring(topic_id FROM '^b([1-7])-')::integer = belt_id
    )
);

CREATE INDEX IF NOT EXISTS practice_topic_reviews_student_created_idx
    ON public.practice_topic_reviews (student_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS practice_topic_reviews_one_pending_idx
    ON public.practice_topic_reviews (student_user_id, belt_id, topic_id)
    WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS practice_topic_reviews_one_approval_idx
    ON public.practice_topic_reviews (student_user_id, belt_id, topic_id)
    WHERE status = 'approved';

ALTER TABLE public.practice_topic_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students and assigned mentors can read topic reviews"
    ON public.practice_topic_reviews;
CREATE POLICY "Students and assigned mentors can read topic reviews"
    ON public.practice_topic_reviews
    FOR SELECT
    TO authenticated
    USING (
        (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
            AND student_user_id = (SELECT auth.uid())
        )
        OR (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'mentor'
            AND (
                EXISTS (
                    SELECT 1
                    FROM public.squad_students AS assignment
                    WHERE assignment.student_user_id = practice_topic_reviews.student_user_id
                      AND assignment.mentor_user_id = (SELECT auth.uid())
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.profiles AS student_profile
                    JOIN public.mentor_squads AS mentor_squad
                      ON mentor_squad.squad_id = student_profile.squad_id
                    WHERE student_profile.user_id = practice_topic_reviews.student_user_id
                      AND mentor_squad.mentor_user_id = (SELECT auth.uid())
                )
            )
        )
    );

GRANT SELECT ON public.practice_topic_reviews TO authenticated;

-- Preserve progress saved before topic reviews were introduced.
INSERT INTO public.practice_topic_reviews (
    student_user_id, belt_id, topic_id, status, mentor_note, reviewed_at
)
SELECT
    progress.user_id,
    substring(topic.key FROM '^b([1-7])-')::integer,
    topic.key,
    'approved',
    'Existing topic completion retained during mentor-review setup.',
    COALESCE(progress.updated_at, now())
FROM public.practise_progress AS progress
CROSS JOIN LATERAL jsonb_each(COALESCE(progress.topic_progress, '{}'::jsonb)) AS topic(key, value)
WHERE topic.key ~ '^b[1-7]-'
  AND topic.value ->> 'completed' = 'true'
  AND jsonb_typeof(public.practice_problem_ids(topic.key)) = 'array'
  AND jsonb_array_length(public.practice_problem_ids(topic.key)) > 0
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.submit_practice_topic_for_review(
    p_belt_id integer,
    p_topic_id text
)
RETURNS public.practice_topic_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    student_id uuid := auth.uid();
    topic_order text[];
    topic_index integer;
    previous_index integer;
    progress_row public.practise_progress%ROWTYPE;
    review_row public.practice_topic_reviews%ROWTYPE;
    problem_id text;
BEGIN
    IF student_id IS NULL
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'student' THEN
        RAISE EXCEPTION 'A signed-in student account is required.';
    END IF;

    topic_order := public.practice_topic_order(p_belt_id);
    topic_index := array_position(topic_order, p_topic_id);
    IF topic_index IS NULL THEN
        RAISE EXCEPTION 'Invalid belt or topic.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.squad_students AS assignment
        WHERE assignment.student_user_id = student_id
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.profiles AS student_profile
        JOIN public.mentor_squads AS mentor_squad
          ON mentor_squad.squad_id = student_profile.squad_id
        WHERE student_profile.user_id = student_id
    ) THEN
        RAISE EXCEPTION 'A mentor must be assigned before requesting a topic review.';
    END IF;

    IF topic_index > 1 THEN
        FOR previous_index IN 1..(topic_index - 1) LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM public.practice_topic_reviews AS review
                WHERE review.student_user_id = student_id
                  AND review.belt_id = p_belt_id
                  AND review.topic_id = topic_order[previous_index]
                  AND review.status = 'approved'
            ) THEN
                RAISE EXCEPTION 'The previous topic must be approved before this topic can be submitted.';
            END IF;
        END LOOP;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.practice_topic_reviews AS review
        WHERE review.student_user_id = student_id
          AND review.belt_id = p_belt_id
          AND review.topic_id = p_topic_id
          AND review.status IN ('pending', 'approved')
    ) THEN
        RAISE EXCEPTION 'This topic already has a pending review or has been approved.';
    END IF;

    SELECT *
    INTO progress_row
    FROM public.practise_progress
    WHERE user_id = student_id
    FOR UPDATE;

    IF NOT FOUND
        OR COALESCE(progress_row.topic_progress -> p_topic_id ->> 'learned', 'false') <> 'true' THEN
        RAISE EXCEPTION 'Finish the learning section before requesting a review.';
    END IF;

    FOR problem_id IN
        SELECT jsonb_array_elements_text(public.practice_problem_ids(p_topic_id))
    LOOP
        IF COALESCE(progress_row.problem_progress -> p_topic_id ->> problem_id, 'false') <> 'true' THEN
            RAISE EXCEPTION 'Complete every practice problem before requesting a review.';
        END IF;
    END LOOP;

    INSERT INTO public.practice_topic_reviews (
        student_user_id, belt_id, topic_id, status
    )
    VALUES (student_id, p_belt_id, p_topic_id, 'pending')
    RETURNING * INTO review_row;

    RETURN review_row;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'This topic already has a pending review or has been approved.'
            USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.review_practice_topic_request(
    p_request_id uuid,
    p_decision text,
    p_mentor_note text DEFAULT NULL
)
RETURNS public.practice_topic_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    mentor_id uuid := auth.uid();
    review_row public.practice_topic_reviews%ROWTYPE;
    progress_row public.practise_progress%ROWTYPE;
    next_topic_progress jsonb;
BEGIN
    IF mentor_id IS NULL
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'mentor' THEN
        RAISE EXCEPTION 'A signed-in mentor account is required.';
    END IF;

    IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Decision must be approved or rejected.';
    END IF;

    SELECT *
    INTO review_row
    FROM public.practice_topic_reviews
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Topic review request not found.';
    END IF;

    IF review_row.status <> 'pending' THEN
        RAISE EXCEPTION 'This topic review has already been decided.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.squad_students AS assignment
        WHERE assignment.student_user_id = review_row.student_user_id
          AND assignment.mentor_user_id = mentor_id
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.profiles AS student_profile
        JOIN public.mentor_squads AS mentor_squad
          ON mentor_squad.squad_id = student_profile.squad_id
        WHERE student_profile.user_id = review_row.student_user_id
          AND mentor_squad.mentor_user_id = mentor_id
    ) THEN
        RAISE EXCEPTION 'You are not assigned to this student.';
    END IF;

    UPDATE public.practice_topic_reviews
    SET status = p_decision,
        mentor_note = NULLIF(LEFT(BTRIM(COALESCE(p_mentor_note, '')), 1000), ''),
        reviewed_by = mentor_id,
        reviewed_at = now()
    WHERE id = p_request_id
    RETURNING * INTO review_row;

    IF p_decision = 'approved' THEN
        SELECT *
        INTO progress_row
        FROM public.practise_progress
        WHERE user_id = review_row.student_user_id
        FOR UPDATE;

        IF NOT FOUND
            OR COALESCE(progress_row.topic_progress -> review_row.topic_id ->> 'learned', 'false') <> 'true'
            OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(
                    public.practice_problem_ids(review_row.topic_id)
                ) AS problem(problem_id)
                WHERE COALESCE(
                    progress_row.problem_progress -> review_row.topic_id ->> problem.problem_id,
                    'false'
                ) <> 'true'
            ) THEN
            RAISE EXCEPTION 'The student must still have all topic requirements completed before approval.';
        END IF;

        next_topic_progress := jsonb_set(
            COALESCE(progress_row.topic_progress, '{}'::jsonb),
            ARRAY[review_row.topic_id],
            COALESCE(
                progress_row.topic_progress -> review_row.topic_id,
                '{}'::jsonb
            ) || jsonb_build_object('completed', true),
            true
        );

        UPDATE public.practise_progress
        SET topic_progress = next_topic_progress,
            belt_progress = public.calculate_belt_progress(next_topic_progress),
            updated_at = now()
        WHERE user_id = review_row.student_user_id;
    END IF;

    RETURN review_row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_practice_topic_for_review(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_practice_topic_for_review(integer, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_practice_topic_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_practice_topic_request(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_practice_topic_review_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    topic record;
    pending_topic record;
    approved_topic record;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        FOR pending_topic IN
            SELECT review.topic_id
            FROM public.practice_topic_reviews AS review
            WHERE review.student_user_id = NEW.user_id
              AND review.status = 'pending'
        LOOP
            IF (NEW.topic_progress -> pending_topic.topic_id ->> 'learned')
                    IS DISTINCT FROM (OLD.topic_progress -> pending_topic.topic_id ->> 'learned')
                OR COALESCE(NEW.problem_progress -> pending_topic.topic_id, '{}'::jsonb)
                    IS DISTINCT FROM COALESCE(OLD.problem_progress -> pending_topic.topic_id, '{}'::jsonb) THEN
                RAISE EXCEPTION 'A topic cannot be changed while its mentor review is pending.';
            END IF;
        END LOOP;
    END IF;

    FOR topic IN
        SELECT key
        FROM jsonb_each(COALESCE(NEW.topic_progress, '{}'::jsonb))
        WHERE value ->> 'completed' = 'true'
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM public.practice_topic_reviews AS review
            WHERE review.student_user_id = NEW.user_id
              AND review.topic_id = topic.key
              AND review.status = 'approved'
        ) THEN
            RAISE EXCEPTION 'A topic must be approved by a mentor before it can be marked complete.';
        END IF;
    END LOOP;

    FOR approved_topic IN
        SELECT review.topic_id
        FROM public.practice_topic_reviews AS review
        WHERE review.student_user_id = NEW.user_id
          AND review.status = 'approved'
    LOOP
        IF COALESCE(NEW.topic_progress -> approved_topic.topic_id ->> 'completed', 'false') <> 'true' THEN
            RAISE EXCEPTION 'An approved topic cannot be marked incomplete.';
        END IF;
    END LOOP;

    NEW.belt_progress := public.calculate_belt_progress(
        COALESCE(NEW.topic_progress, '{}'::jsonb)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practice_topic_review_gate
    ON public.practise_progress;
CREATE TRIGGER practice_topic_review_gate
    BEFORE INSERT OR UPDATE ON public.practise_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_practice_topic_review_gate();

COMMIT;
