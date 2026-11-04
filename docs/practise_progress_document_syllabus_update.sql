-- Apply the submitted Coding Dojo CSV syllabus to an already-migrated database.
-- This script only replaces validation/calculation functions and recalculates
-- existing belt JSON; it does not drop columns, rows, or backup data.

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

DO $$
BEGIN
    IF to_regclass('public.practise_progress') IS NULL THEN
        RAISE EXCEPTION 'public.practise_progress does not exist; update stopped.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'practise_progress'
          AND column_name IN ('belt_progress', 'topic_progress')
        GROUP BY table_schema, table_name
        HAVING COUNT(*) = 2
    ) THEN
        RAISE EXCEPTION 'Required progress columns are missing; update stopped.';
    END IF;
END $$;

UPDATE public.practise_progress
SET belt_progress = public.calculate_belt_progress(topic_progress);
