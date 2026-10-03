CREATE POLICY "Public read lessons of published courses"
ON public.lessons
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM course_sections cs
    JOIN courses c ON c.id = cs.course_id
    WHERE cs.id = lessons.section_id
    AND c.is_published = true
  )
);