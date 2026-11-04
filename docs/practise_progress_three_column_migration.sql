-- Run this script in the Supabase SQL Editor only after reviewing it.
-- It migrates the existing one-row-per-student progress JSONB into three
-- JSONB columns. It does not drop progress or practise_progress_legacy_backup.

DO $$
DECLARE
    v_column_name text;
BEGIN
    IF to_regclass('public.practise_progress') IS NULL THEN
        RAISE EXCEPTION 'public.practise_progress does not exist; migration stopped.';
    END IF;

    FOREACH v_column_name IN ARRAY ARRAY['user_id', 'progress', 'updated_at'] LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns AS c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'practise_progress'
              AND c.column_name = v_column_name
        ) THEN
            RAISE EXCEPTION
                'Expected column % is missing from public.practise_progress; migration stopped.',
                v_column_name;
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint AS constraint_row
        JOIN pg_attribute AS attribute_row
          ON attribute_row.attrelid = constraint_row.conrelid
         AND attribute_row.attnum = ANY (constraint_row.conkey)
        WHERE constraint_row.conrelid = 'public.practise_progress'::regclass
          AND constraint_row.contype IN ('p', 'u')
          AND constraint_row.conkey = ARRAY[attribute_row.attnum]::smallint[]
          AND attribute_row.attname = 'user_id'
    ) THEN
        RAISE EXCEPTION
            'public.practise_progress.user_id must have a PRIMARY KEY or UNIQUE constraint before the migration; migration stopped.';
    END IF;
END $$;

ALTER TABLE public.practise_progress
    ADD COLUMN IF NOT EXISTS belt_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS topic_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS problem_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

-- This mapping comes from frontend/src/pages/studentdashboard/belts/Belt*.jsx.
-- It converts the old solvedProblems array indexes into actual problem slugs.
CREATE OR REPLACE FUNCTION public.practice_problem_ids(p_topic_id text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE p_topic_id
        WHEN 'b1-variables-assignment-data-types' THEN
            '["add-two-integers","concatenation-of-array","richest-customer-wealth","number-of-good-pairs","shuffle-the-array","final-value-of-variable-after-performing-operations"]'::jsonb
        WHEN 'b1-variable-scope-debugging' THEN
            '["create-hello-world-function","counter","to-be-or-not-to-be","return-length-of-arguments-passed","apply-transform-over-each-element-in-array","memoize"]'::jsonb
        WHEN 'b1-operators-precedence' THEN
            '["subtract-the-product-and-sum-of-digits-of-an-integer","number-of-steps-to-reduce-a-number-to-zero","calculate-money-in-leetcode-bank","sum-of-squares-of-special-elements","find-the-highest-altitude","smallest-even-multiple"]'::jsonb
        WHEN 'b1-input-output-and-formatted-output' THEN
            '["fizz-buzz","add-two-integers","richest-customer-wealth","number-of-good-pairs","kids-with-the-greatest-number-of-candies","running-sum-of-1d-array"]'::jsonb
        WHEN 'b1-boolean-conditions' THEN
            '["fizz-buzz","maximum-number-of-words-found-in-sentences","number-of-employees-who-met-the-target","neither-minimum-nor-maximum","find-the-town-judge","check-if-two-chessboard-squares-have-the-same-color"]'::jsonb
        WHEN 'b1-functions-parameters-return-values-and-pass-by-value-reference' THEN
            '["create-hello-world-function","counter","to-be-or-not-to-be","return-length-of-arguments-passed","apply-transform-over-each-element-in-array","filter-elements-from-array"]'::jsonb
        WHEN 'b1-basic-debugging-and-tracing-syntax-runtime-and-logical-errors' THEN
            '["fizz-buzz","palindrome-number","reverse-integer","plus-one","add-digits","number-of-steps-to-reduce-a-number-to-zero"]'::jsonb
        WHEN 'b2-for-while-do-while' THEN
            '["running-sum-of-1d-array","fizz-buzz","number-of-steps-to-reduce-a-number-to-zero","calculate-money-in-leetcode-bank","find-numbers-with-even-number-of-digits","count-odd-numbers-in-an-interval-range"]'::jsonb
        WHEN 'b2-break-continue-sentinel-loops' THEN
            '["fizz-buzz","count-the-number-of-consistent-strings","find-numbers-with-even-number-of-digits","contains-duplicate","missing-number","find-all-numbers-disappeared-in-an-array"]'::jsonb
        WHEN 'b2-nested-loops-pattern-iteration' THEN
            '["fizz-buzz","build-array-from-permutation","concatenation-of-array","running-sum-of-1d-array","pascals-triangle","pascals-triangle-ii"]'::jsonb
        WHEN 'b2-basic-mathematics-gcd-lcm-primes-and-sieve-of-eratosthenes' THEN
            '["count-primes","ugly-number","greatest-common-divisor-of-strings","find-greatest-common-divisor-of-array","count-common-factors","prime-arrangements"]'::jsonb
        WHEN 'b2-digit-problems-modular-arithmetic-fast-exponentiation-and-fractions' THEN
            '["palindrome-number","reverse-integer","add-digits","powx-n","super-pow","fraction-addition-and-subtraction"]'::jsonb
        WHEN 'b2-complexity-o-1-o-n-o-n-and-the-cost-of-nested-loops' THEN
            '["contains-duplicate","two-sum","running-sum-of-1d-array","number-of-good-pairs","richest-customer-wealth","find-numbers-with-even-number-of-digits"]'::jsonb
        WHEN 'b3-arrays-crud-indexing-bounds-and-traversal' THEN
            '["build-array-from-permutation","concatenation-of-array","running-sum-of-1d-array","remove-element","missing-number","find-all-numbers-disappeared-in-an-array"]'::jsonb
        WHEN 'b3-array-operations-insertion-deletion-by-shifting-reverse-rotate-merge-sorted-arrays-and-rearrangement' THEN
            '["reverse-string","rotate-array","merge-sorted-array","move-zeroes","replace-elements-with-greatest-element-on-right-side","shuffle-the-array"]'::jsonb
        WHEN 'b3-strings-crud-substrings-comparison-palindrome-anagram-reversal-and-basic-compression' THEN
            '["valid-palindrome","reverse-string","valid-anagram","longest-common-prefix","find-the-index-of-the-first-occurrence-in-a-string","string-compression"]'::jsonb
        WHEN 'b3-matrices-2d-arrays' THEN
            '["matrix-diagonal-sum","transpose-matrix","reshape-the-matrix","spiral-matrix","rotate-image","search-a-2d-matrix"]'::jsonb
        WHEN 'b3-frequency-hash-map' THEN
            '["majority-element","single-number","valid-anagram","ransom-note","find-the-difference","top-k-frequent-elements"]'::jsonb
        WHEN 'b3-time-growth-complexity' THEN
            '["contains-duplicate","two-sum","running-sum-of-1d-array","number-of-good-pairs","maximum-subarray","product-of-array-except-self"]'::jsonb
        WHEN 'b4-subarrays-and-subsequences-generation-and-subarray-sum-problems' THEN
            '["maximum-subarray","maximum-average-subarray-i","subarray-sum-equals-k","minimum-size-subarray-sum","maximum-product-subarray","number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold"]'::jsonb
        WHEN 'b4-prefix-suffix-sums-and-prefix-xor-pivot-index-and-product-except-self' THEN
            '["find-pivot-index","range-sum-query-immutable","product-of-array-except-self","find-the-highest-altitude","left-and-right-sum-differences","xor-queries-of-a-subarray"]'::jsonb
        WHEN 'b4-hashing-counting-lookup-two-sum-subarray-sum-k-and-group-anagrams' THEN
            '["two-sum","group-anagrams","subarray-sum-equals-k","top-k-frequent-elements","longest-consecutive-sequence","4sum-ii"]'::jsonb
        WHEN 'b4-kadanes-algorithm' THEN
            '["maximum-subarray","maximum-product-subarray","sort-colors","majority-element","majority-element-ii","best-time-to-buy-and-sell-stock"]'::jsonb
        WHEN 'b4-sliding-window' THEN
            '["maximum-average-subarray-i","minimum-size-subarray-sum","longest-substring-without-repeating-characters","permutation-in-string","find-all-anagrams-in-a-string","max-consecutive-ones-iii"]'::jsonb
        WHEN 'b4-basic-sorting' THEN
            '["sort-an-array","sort-colors","largest-number","relative-sort-array","height-checker","insertion-sort-list"]'::jsonb
        WHEN 'b4-two-pointers-opposite-ends-same-direction-and-three-sum' THEN
            '["two-sum-ii-input-array-is-sorted","3sum","container-with-most-water","remove-duplicates-from-sorted-array","move-zeroes","trapping-rain-water"]'::jsonb
        WHEN 'b4-binary-search-lower-upper-bound-rotated-arrays-2d-matrices-and-peak-element' THEN
            '["binary-search","find-first-and-last-position-of-element-in-sorted-array","search-in-rotated-sorted-array","find-minimum-in-rotated-sorted-array","find-peak-element","search-a-2d-matrix"]'::jsonb
        WHEN 'b4-counting-sort-and-radix-sort-non-comparison-sorting' THEN
            '["sort-an-array","sort-colors","relative-sort-array","maximum-gap","h-index","height-checker"]'::jsonb
        WHEN 'b5-singly-linked-lists' THEN
            '["design-linked-list","reverse-linked-list","middle-of-the-linked-list","merge-two-sorted-lists","remove-linked-list-elements","palindrome-linked-list"]'::jsonb
        WHEN 'b5-doubly-circular-linked-lists' THEN
            '["design-linked-list","flatten-a-multilevel-doubly-linked-list","insert-into-a-sorted-circular-linked-list","lru-cache","remove-duplicates-from-sorted-list-ii","rotate-list"]'::jsonb
        WHEN 'b5-linked-list-problem-solving-reverse-middle-node-and-merge-sorted-lists' THEN
            '["reverse-linked-list","reverse-linked-list-ii","middle-of-the-linked-list","merge-two-sorted-lists","remove-nth-node-from-end-of-list","reorder-list"]'::jsonb
        WHEN 'b5-stacks' THEN
            '["valid-parentheses","min-stack","evaluate-reverse-polish-notation","daily-temperatures","next-greater-element-i","online-stock-span"]'::jsonb
        WHEN 'b5-queues' THEN
            '["design-circular-queue","implement-queue-using-stacks","number-of-recent-calls","dota2-senate","design-front-middle-back-queue","time-needed-to-buy-tickets"]'::jsonb
        WHEN 'b5-deque-operations-and-sliding-window-maximum' THEN
            '["sliding-window-maximum","design-circular-deque","reveal-cards-in-increasing-order","longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit","jump-game-vi","shortest-subarray-with-sum-at-least-k"]'::jsonb
        WHEN 'b5-monotonic-stack' THEN
            '["daily-temperatures","next-greater-element-i","next-greater-element-ii","largest-rectangle-in-histogram","trapping-rain-water","sum-of-subarray-minimums"]'::jsonb
        WHEN 'b5-hare-tortoise' THEN
            '["linked-list-cycle","linked-list-cycle-ii","happy-number","find-the-duplicate-number","middle-of-the-linked-list","palindrome-linked-list"]'::jsonb
        WHEN 'b6-recursion-fundamentals' THEN
            '["fibonacci-number","powx-n","climbing-stairs","reverse-string","swap-nodes-in-pairs","k-th-symbol-in-grammar"]'::jsonb
        WHEN 'b6-recursion-tree-stack-depth' THEN
            '["fibonacci-number","powx-n","add-digits","reverse-integer","climbing-stairs","different-ways-to-add-parentheses"]'::jsonb
        WHEN 'b6-divide-and-conquer-merge-sort-quick-sort-and-quickselect' THEN
            '["sort-an-array","sort-list","kth-largest-element-in-an-array","kth-largest-element-in-a-stream","the-skyline-problem","maximum-subarray"]'::jsonb
        WHEN 'b6-backtracking-fundamentals' THEN
            '["subsets","permutations","combination-sum","generate-parentheses","letter-combinations-of-a-phone-number","word-search"]'::jsonb
        WHEN 'b6-subsets-subsequences-power-set' THEN
            '["subsets","subsets-ii","permutations","permutations-ii","combinations","combination-sum"]'::jsonb
        WHEN 'b6-permutations-duplicate-handling' THEN
            '["subsets-ii","permutations-ii","combination-sum-ii","letter-tile-possibilities","non-decreasing-subsequences","beautiful-arrangement"]'::jsonb
        WHEN 'b6-constraint-based-search-word-search-n-queens-sudoku-and-rat-in-a-maze' THEN
            '["word-search","n-queens","n-queens-ii","sudoku-solver","unique-paths-iii","path-with-maximum-gold"]'::jsonb
        WHEN 'b7-binary-search-answer-space' THEN
            '["koko-eating-bananas","capacity-to-ship-packages-within-d-days","minimum-number-of-days-to-make-m-bouquets","split-array-largest-sum","find-the-smallest-divisor-given-a-threshold","magnetic-force-between-two-balls"]'::jsonb
        WHEN 'b7-greedy-algorithms' THEN
            '["assign-cookies","lemonade-change","maximum-units-on-a-truck","can-place-flowers","jump-game","gas-station"]'::jsonb
        WHEN 'b7-greedy-applications-activity-selection-interval-scheduling-job-sequencing-and-jump-game' THEN
            '["non-overlapping-intervals","minimum-number-of-arrows-to-burst-balloons","meeting-rooms","meeting-rooms-ii","jump-game","jump-game-ii"]'::jsonb
        WHEN 'b7-when-greedy-fails-0-1-knapsack-coin-change-and-longest-increasing-subsequence' THEN
            '["coin-change","coin-change-2","partition-equal-subset-sum","last-stone-weight-ii","longest-increasing-subsequence","ones-and-zeroes"]'::jsonb
        WHEN 'b7-choosing-the-right-approach-binary-search-on-answer-space-vs-greedy-vs-dynamic-programming' THEN
            '["koko-eating-bananas","capacity-to-ship-packages-within-d-days","jump-game","jump-game-ii","coin-change","longest-increasing-subsequence"]'::jsonb
        ELSE '[]'::jsonb
    END;
$$;

CREATE OR REPLACE FUNCTION public.practice_canonical_topic_id(p_topic_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE p_topic_id
        WHEN 'b1-variables' THEN 'b1-variables-assignment-data-types'
        WHEN 'b1-assignment' THEN 'b1-variables-assignment-data-types'
        WHEN 'b1-data-types' THEN 'b1-variables-assignment-data-types'
        WHEN 'b1-input-output' THEN 'b1-variables-assignment-data-types'
        WHEN 'b1-type-conversion' THEN 'b1-variables-assignment-data-types'
        WHEN 'b2-arithmetic' THEN 'b1-operators-precedence'
        ELSE p_topic_id
    END;
$$;

WITH source AS (
    SELECT
        p.user_id,
        p.progress,
        p.updated_at
    FROM public.practise_progress AS p
),
topic_values AS (
    SELECT
        source.user_id,
        public.practice_canonical_topic_id(entry.key) AS topic_id,
        entry.key AS source_topic_id,
        CASE
            WHEN entry.key = public.practice_canonical_topic_id(entry.key)
                THEN entry.value
            ELSE jsonb_set(
                jsonb_set(
                    entry.value,
                    '{solvedProblems}',
                    '[]'::jsonb,
                    true
                ),
                '{completed}',
                'false'::jsonb,
                true
            )
        END AS topic
    FROM source
    CROSS JOIN LATERAL jsonb_each(
        CASE
            WHEN jsonb_typeof(source.progress) = 'object'
                THEN source.progress
            ELSE '{}'::jsonb
        END
    ) AS entry
    WHERE jsonb_array_length(
        public.practice_problem_ids(
            public.practice_canonical_topic_id(entry.key)
        )
    ) > 0
),
topic_status AS (
    SELECT
        user_id,
        topic_id,
        bool_or(COALESCE((topic->>'learned')::boolean, false)) AS learned,
        bool_or(COALESCE((topic->>'completed')::boolean, false)) AS completed
    FROM topic_values
    GROUP BY user_id, topic_id
),
problem_values AS (
    SELECT
        topic_values.user_id,
        topic_values.topic_id,
        problems.problem_id,
        bool_or(
            EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                    CASE
                        WHEN jsonb_typeof(topic_values.topic->'solvedProblems') = 'array'
                            THEN topic_values.topic->'solvedProblems'
                        ELSE '[]'::jsonb
                    END
                ) AS solved(value)
                WHERE solved.value #>> '{}' = problems.problem_id
                   OR (
                       topic_values.source_topic_id = topic_values.topic_id
                       AND solved.value #>> '{}' ~ '^[0-9]+$'
                       AND (solved.value #>> '{}')::integer = problems.problem_number - 1
                   )
            )
        ) AS solved
    FROM topic_values
    CROSS JOIN LATERAL jsonb_array_elements_text(
        public.practice_problem_ids(topic_values.topic_id)
    ) WITH ORDINALITY AS problems(problem_id, problem_number)
    GROUP BY topic_values.user_id, topic_values.topic_id, problems.problem_id
),
problem_json AS (
    SELECT
        user_id,
        jsonb_object_agg(topic_id, topic_problems) AS problem_progress
    FROM (
        SELECT
            user_id,
            topic_id,
            jsonb_object_agg(problem_id, solved) AS topic_problems
        FROM problem_values
        GROUP BY user_id, topic_id
    ) AS topic_problem_values
    GROUP BY user_id
),
topic_json AS (
    SELECT
        topic_status.user_id,
        jsonb_object_agg(
            topic_status.topic_id,
            jsonb_build_object(
                'learned', topic_status.learned,
                'completed', topic_status.completed
            )
        ) AS topic_progress,
        COALESCE(problem_json.problem_progress, '{}'::jsonb) AS problem_progress
    FROM topic_status
    LEFT JOIN problem_json
        ON problem_json.user_id = topic_status.user_id
    GROUP BY topic_status.user_id, problem_json.problem_progress
)
UPDATE public.practise_progress AS target
SET
    topic_progress = topic_json.topic_progress || COALESCE(target.topic_progress, '{}'::jsonb),
    problem_progress = (
        SELECT COALESCE(
            jsonb_object_agg(problem_groups.topic_id, problem_groups.values),
            '{}'::jsonb
        )
        FROM (
            SELECT
                COALESCE(incoming.key, existing.key) AS topic_id,
                COALESCE(incoming.value, '{}'::jsonb)
                    || COALESCE(existing.value, '{}'::jsonb) AS values
            FROM jsonb_each(topic_json.problem_progress) AS incoming
            FULL OUTER JOIN jsonb_each(
                COALESCE(target.problem_progress, '{}'::jsonb)
            ) AS existing
                ON existing.key = incoming.key
        ) AS problem_groups
    ),
    updated_at = GREATEST(target.updated_at, now())
FROM topic_json
WHERE target.user_id = topic_json.user_id;

WITH topic_counts AS (
    SELECT
        p.user_id,
        belt_number,
        COUNT(*) FILTER (
            WHERE COALESCE((topic.value->>'completed')::boolean, false)
        )::integer AS completed_topics
    FROM public.practise_progress AS p
    CROSS JOIN LATERAL jsonb_each(p.topic_progress) AS topic
    CROSS JOIN LATERAL (
        SELECT substring(topic.key FROM '^b([1-7])-')::integer AS belt_number
    ) AS belt
    WHERE jsonb_array_length(public.practice_problem_ids(topic.key)) > 0
    GROUP BY p.user_id, belt_number
),
belt_values AS (
    SELECT
        p.user_id,
        jsonb_build_object(
            'belt_1', jsonb_build_object('unlocked', true, 'completed', COALESCE(c1.completed_topics, 0) = 7, 'completedTopics', COALESCE(c1.completed_topics, 0), 'totalTopics', 7, 'completionPercentage', (COALESCE(c1.completed_topics, 0) * 100) / 7),
            'belt_2', jsonb_build_object('unlocked', COALESCE(c1.completed_topics, 0) = 7, 'completed', COALESCE(c2.completed_topics, 0) = 6, 'completedTopics', COALESCE(c2.completed_topics, 0), 'totalTopics', 6, 'completionPercentage', (COALESCE(c2.completed_topics, 0) * 100) / 6),
            'belt_3', jsonb_build_object('unlocked', COALESCE(c2.completed_topics, 0) = 6, 'completed', COALESCE(c3.completed_topics, 0) = 6, 'completedTopics', COALESCE(c3.completed_topics, 0), 'totalTopics', 6, 'completionPercentage', (COALESCE(c3.completed_topics, 0) * 100) / 6),
            'belt_4', jsonb_build_object('unlocked', COALESCE(c3.completed_topics, 0) = 6, 'completed', COALESCE(c4.completed_topics, 0) = 9, 'completedTopics', COALESCE(c4.completed_topics, 0), 'totalTopics', 9, 'completionPercentage', (COALESCE(c4.completed_topics, 0) * 100) / 9),
            'belt_5', jsonb_build_object('unlocked', COALESCE(c4.completed_topics, 0) = 9, 'completed', COALESCE(c5.completed_topics, 0) = 8, 'completedTopics', COALESCE(c5.completed_topics, 0), 'totalTopics', 8, 'completionPercentage', (COALESCE(c5.completed_topics, 0) * 100) / 8),
            'belt_6', jsonb_build_object('unlocked', COALESCE(c5.completed_topics, 0) = 8, 'completed', COALESCE(c6.completed_topics, 0) = 7, 'completedTopics', COALESCE(c6.completed_topics, 0), 'totalTopics', 7, 'completionPercentage', (COALESCE(c6.completed_topics, 0) * 100) / 7),
            'belt_7', jsonb_build_object('unlocked', COALESCE(c6.completed_topics, 0) = 7, 'completed', COALESCE(c7.completed_topics, 0) = 5, 'completedTopics', COALESCE(c7.completed_topics, 0), 'totalTopics', 5, 'completionPercentage', (COALESCE(c7.completed_topics, 0) * 100) / 5)
        ) AS belt_progress
    FROM public.practise_progress AS p
    LEFT JOIN topic_counts c1 ON c1.user_id = p.user_id AND c1.belt_number = 1
    LEFT JOIN topic_counts c2 ON c2.user_id = p.user_id AND c2.belt_number = 2
    LEFT JOIN topic_counts c3 ON c3.user_id = p.user_id AND c3.belt_number = 3
    LEFT JOIN topic_counts c4 ON c4.user_id = p.user_id AND c4.belt_number = 4
    LEFT JOIN topic_counts c5 ON c5.user_id = p.user_id AND c5.belt_number = 5
    LEFT JOIN topic_counts c6 ON c6.user_id = p.user_id AND c6.belt_number = 6
    LEFT JOIN topic_counts c7 ON c7.user_id = p.user_id AND c7.belt_number = 7
)
UPDATE public.practise_progress AS target
SET belt_progress = belt_values.belt_progress
FROM belt_values
WHERE target.user_id = belt_values.user_id;

ALTER TABLE public.practise_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read their own practice progress"
    ON public.practise_progress;
CREATE POLICY "Students can read their own practice progress"
    ON public.practise_progress FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert their own practice progress"
    ON public.practise_progress;
CREATE POLICY "Students can insert their own practice progress"
    ON public.practise_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update their own practice progress"
    ON public.practise_progress;
CREATE POLICY "Students can update their own practice progress"
    ON public.practise_progress FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.calculate_belt_progress(p_topic_progress jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    belt_key text;
    belt_total integer;
    completed_topics integer;
    previous_completed boolean;
    result jsonb := '{}'::jsonb;
BEGIN
    FOR belt_key, belt_total IN
        SELECT *
        FROM (VALUES
            ('belt_1', 7), ('belt_2', 6), ('belt_3', 6), ('belt_4', 9),
            ('belt_5', 8), ('belt_6', 7), ('belt_7', 5)
        ) AS totals(key, total)
    LOOP
        SELECT COUNT(*)::integer
        INTO completed_topics
        FROM jsonb_each(COALESCE(p_topic_progress, '{}'::jsonb)) AS topics(key, value)
        WHERE topics.key LIKE 'b' || substring(belt_key FROM 6) || '-%'
          AND jsonb_array_length(public.practice_problem_ids(topics.key)) > 0
          AND COALESCE((topics.value->>'completed')::boolean, false);

        SELECT COALESCE(
            (result #>> ARRAY[
                'belt_' || (substring(belt_key FROM 6)::integer - 1)::text,
                'completed'
            ])::boolean,
            false
        )
        INTO previous_completed;

        result := jsonb_set(
            result,
            ARRAY[belt_key],
            jsonb_build_object(
                'unlocked',
                    CASE
                        WHEN belt_key = 'belt_1' THEN true
                        ELSE previous_completed
                    END,
                'completed', completed_topics = belt_total,
                'completedTopics', completed_topics,
                'totalTopics', belt_total,
                'completionPercentage', (completed_topics * 100) / belt_total
            ),
            true
        );
    END LOOP;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_practice_topic_progress(
    p_belt_id integer,
    p_topic_id text,
    p_learned boolean,
    p_solved_problems jsonb,
    p_completed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    current_row public.practise_progress%ROWTYPE;
    next_topic jsonb;
    next_problem jsonb;
    next_topic_progress jsonb;
    next_problem_progress jsonb;
    next_belt_progress jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    IF p_belt_id IS NULL OR p_belt_id NOT BETWEEN 1 AND 7 THEN
        RAISE EXCEPTION 'Invalid belt ID %. Expected a value from 1 through 7.', p_belt_id;
    END IF;

    IF p_topic_id IS NULL
        OR jsonb_array_length(public.practice_problem_ids(p_topic_id)) = 0
        OR substring(p_topic_id FROM '^b([1-7])-') IS NULL
        OR substring(p_topic_id FROM '^b([1-7])-')::integer <> p_belt_id THEN
        RAISE EXCEPTION
            'Invalid topic/belt combination: topic %, belt %.',
            p_topic_id,
            p_belt_id;
    END IF;

    SELECT *
    INTO current_row
    FROM public.practise_progress
    WHERE user_id = auth.uid()
    FOR UPDATE;

    next_topic := jsonb_build_object(
        'learned', p_learned,
        'completed', p_completed
    );

    SELECT COALESCE(
        jsonb_object_agg(
            problem_id,
            EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                    CASE
                        WHEN jsonb_typeof(COALESCE(p_solved_problems, '[]'::jsonb)) = 'array'
                            THEN COALESCE(p_solved_problems, '[]'::jsonb)
                        ELSE '[]'::jsonb
                    END
                ) AS solved(value)
                WHERE solved.value #>> '{}' = problem_id
                   OR (
                       solved.value #>> '{}' ~ '^[0-9]+$'
                       AND (solved.value #>> '{}')::integer = problem_number - 1
                   )
            )
        ),
        '{}'::jsonb
    )
    INTO next_problem
    FROM jsonb_array_elements_text(public.practice_problem_ids(p_topic_id))
        WITH ORDINALITY AS problems(problem_id, problem_number);

    next_topic_progress := jsonb_set(
        COALESCE(current_row.topic_progress, '{}'::jsonb),
        ARRAY[p_topic_id],
        next_topic,
        true
    );
    next_problem_progress := jsonb_set(
        COALESCE(current_row.problem_progress, '{}'::jsonb),
        ARRAY[p_topic_id],
        next_problem,
        true
    );

    next_belt_progress := public.calculate_belt_progress(next_topic_progress);

    INSERT INTO public.practise_progress (
        user_id, belt_progress, topic_progress, problem_progress, updated_at
    )
    VALUES (
        auth.uid(), next_belt_progress, next_topic_progress, next_problem_progress, now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        belt_progress = public.calculate_belt_progress(
            public.practise_progress.topic_progress
                || EXCLUDED.topic_progress
        ),
        topic_progress = public.practise_progress.topic_progress
            || EXCLUDED.topic_progress,
        problem_progress = public.practise_progress.problem_progress
            || EXCLUDED.problem_progress,
        updated_at = EXCLUDED.updated_at;

    SELECT *
    INTO current_row
    FROM public.practise_progress
    WHERE user_id = auth.uid();

    RETURN jsonb_build_object(
        'beltProgress', current_row.belt_progress,
        'topicProgress', current_row.topic_progress,
        'problemProgress', current_row.problem_progress
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_legacy_practice_progress(p_progress jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    current_row public.practise_progress%ROWTYPE;
    entry record;
    topic jsonb;
    solved jsonb;
    canonical_topic_id text;
    topic_values jsonb := '{}';
    problem_values jsonb := '{}';
    merged_topic_progress jsonb;
    merged_problem_progress jsonb;
    merged_belt_progress jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    SELECT *
    INTO current_row
    FROM public.practise_progress
    WHERE user_id = auth.uid()
    FOR UPDATE;

    FOR entry IN
        SELECT *
        FROM jsonb_each(
            CASE
                WHEN jsonb_typeof(COALESCE(p_progress, '{}'::jsonb)) = 'object'
                    THEN COALESCE(p_progress, '{}'::jsonb)
                ELSE '{}'::jsonb
            END
        )
    LOOP
        topic := entry.value;
        canonical_topic_id :=
            public.practice_canonical_topic_id(entry.key);

        IF jsonb_array_length(
            public.practice_problem_ids(canonical_topic_id)
        ) = 0 THEN
            RAISE EXCEPTION
                'Invalid legacy practice topic ID: %. Migration stopped for this student.',
                entry.key;
        END IF;

        solved := CASE
            WHEN entry.key = canonical_topic_id
                AND jsonb_typeof(topic->'solvedProblems') = 'array'
                THEN topic->'solvedProblems'
            ELSE '[]'::jsonb
        END;
        topic_values := jsonb_set(
            topic_values,
            ARRAY[canonical_topic_id],
            jsonb_build_object(
                'learned', COALESCE((topic->>'learned')::boolean, false),
                'completed',
                    CASE
                        WHEN entry.key = canonical_topic_id
                            THEN COALESCE((topic->>'completed')::boolean, false)
                        ELSE false
                    END
            ),
            true
        );
        problem_values := jsonb_set(
            problem_values,
            ARRAY[canonical_topic_id],
            (
                SELECT COALESCE(
                    jsonb_object_agg(
                        problem_id,
                        EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements(solved) AS solved_value(value)
                            WHERE solved_value.value #>> '{}' = problem_id
                               OR (
                                   solved_value.value #>> '{}' ~ '^[0-9]+$'
                                   AND (solved_value.value #>> '{}')::integer = problem_number - 1
                               )
                        )
                    ),
                    '{}'::jsonb
                )
                FROM jsonb_array_elements_text(
                    public.practice_problem_ids(canonical_topic_id)
                ) WITH ORDINALITY AS problems(problem_id, problem_number)
            ),
            true
        );
    END LOOP;

    -- Existing database keys win over localStorage keys. This makes the
    -- migration additive and prevents stale browser data from overwriting
    -- newer server progress.
    merged_topic_progress :=
        topic_values || COALESCE(current_row.topic_progress, '{}'::jsonb);

    merged_problem_progress := COALESCE(
        current_row.problem_progress,
        '{}'::jsonb
    );

    FOR entry IN SELECT * FROM jsonb_each(problem_values)
    LOOP
        merged_problem_progress := jsonb_set(
            merged_problem_progress,
            ARRAY[entry.key],
            entry.value
                || COALESCE(merged_problem_progress->entry.key, '{}'::jsonb),
            true
        );
    END LOOP;

    merged_belt_progress :=
        public.calculate_belt_progress(merged_topic_progress);

    INSERT INTO public.practise_progress (
        user_id, belt_progress, topic_progress, problem_progress, updated_at
    )
    VALUES (
        auth.uid(),
        merged_belt_progress,
        merged_topic_progress,
        merged_problem_progress,
        now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        belt_progress = public.calculate_belt_progress(
            EXCLUDED.topic_progress
                || public.practise_progress.topic_progress
        ),
        topic_progress = EXCLUDED.topic_progress
            || public.practise_progress.topic_progress,
        problem_progress = (
            SELECT COALESCE(jsonb_object_agg(problem_groups.topic_id, problem_groups.values), '{}'::jsonb)
            FROM (
                SELECT
                    COALESCE(incoming.key, existing.key) AS topic_id,
                    COALESCE(incoming.value, '{}'::jsonb)
                        || COALESCE(existing.value, '{}'::jsonb) AS values
                FROM jsonb_each(EXCLUDED.problem_progress) AS incoming
                FULL OUTER JOIN jsonb_each(public.practise_progress.problem_progress) AS existing
                    ON existing.key = incoming.key
            ) AS problem_groups
        ),
        updated_at = EXCLUDED.updated_at;

    SELECT *
    INTO current_row
    FROM public.practise_progress
    WHERE user_id = auth.uid();

    RETURN jsonb_build_object(
        'beltProgress', current_row.belt_progress,
        'topicProgress', current_row.topic_progress,
        'problemProgress', current_row.problem_progress
    );
END;
$$;
