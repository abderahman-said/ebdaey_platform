create policy "Public can view live course gifts"
on public.gift_courses
for select
using (
  exists (
    select 1 from public.live_courses lc
    where lc.id = gift_courses.live_course_id
      and lc.is_published = true
  )
);