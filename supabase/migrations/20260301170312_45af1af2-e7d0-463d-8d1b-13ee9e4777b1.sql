
-- Allow mentors to update students in their tenant
CREATE POLICY "Mentors can update own tenant students"
ON public.students FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Allow lesson_progress delete for students
CREATE POLICY "Students can delete own progress"
ON public.lesson_progress FOR DELETE TO authenticated
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
