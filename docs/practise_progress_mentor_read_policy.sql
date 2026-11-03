CREATE POLICY "Mentors can read assigned student practice progress"
ON public.practise_progress
FOR SELECT
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'mentor'
    AND EXISTS (
        SELECT 1
        FROM public.squad_students AS assignment
        WHERE assignment.student_user_id = practise_progress.user_id
          AND assignment.mentor_user_id = (SELECT auth.uid())
    )
);
