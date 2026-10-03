UPDATE public.notification_templates SET
  subject_en = 'Purchase confirmed: {{product_title}} ✅',
  body_en = 'Hello {{student_name}},

Thank you for your purchase from {{mentor_name}}.

Product: {{product_title}}
Amount: {{amount}} EGP
Order ID: {{order_id}}

You can access your purchases here:
{{access_url}}'
WHERE template_key = 'student.purchase_confirmation';

UPDATE public.notification_templates SET
  subject_en = 'Welcome to {{mentor_name}} 👋',
  body_en = 'Hello {{student_name}},

We are glad to have you on board.

You can sign in and access your purchases here:
{{login_url}}'
WHERE template_key = 'student.welcome';

UPDATE public.notification_templates SET
  subject_en = 'Set your account password',
  body_en = 'Hello {{student_name}},

Your account has been created automatically. To finish accessing your purchases, please set a password using this link:

{{setup_url}}

This link is valid for a limited time.'
WHERE template_key = 'student.password_setup';

UPDATE public.notification_templates SET
  subject_en = 'Reminder: {{course_title}} session starts in an hour',
  body_en = 'Hello {{student_name}},

This is a reminder that the session "{{session_title}}" in the course "{{course_title}}" starts at {{start_time}}.

Join link:
{{meeting_url}}'
WHERE template_key = 'student.live_session_reminder';

UPDATE public.notification_templates SET
  subject_en = 'New lesson in {{course_title}}',
  body_en = 'Hello {{student_name}},

A new lesson "{{lesson_title}}" has been added to the course "{{course_title}}".

Watch it now:
{{lesson_url}}'
WHERE template_key = 'student.new_lesson_published';