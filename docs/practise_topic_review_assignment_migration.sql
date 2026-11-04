-- Align review submission and decision authorization with the mentor dashboard's
-- direct-student and mentor-owned-squad assignment paths.
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
