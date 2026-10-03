
ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS subject_en TEXT,
  ADD COLUMN IF NOT EXISTS body_en TEXT;

UPDATE public.notification_templates SET subject_en = 'Confirm your email change', body_en = 'You requested to change your email from {{email}} to {{new_email}}.

Confirm the change here:
{{confirmation_url}}' WHERE template_key = 'auth.email_change';

UPDATE public.notification_templates SET subject_en = 'Reset your password', body_en = 'We received a request to reset your password.

Click the link below to choose a new password:

{{confirmation_url}}

If you did not request this, you can safely ignore this email.' WHERE template_key = 'auth.password_recovery';

UPDATE public.notification_templates SET subject_en = 'Confirm your email', body_en = 'Use the following code to confirm your email:

{{token}}

This code is valid for a limited time.' WHERE template_key = 'auth.signup_confirmation';

UPDATE public.notification_templates SET subject_en = 'New order from {{student_name}} 🎉', body_en = 'Hi {{mentor_name}},

You have a new order on your platform:

Product: {{product_title}}
Student: {{student_name}}
Email: {{student_email}}
Amount: {{amount}} EGP

Manage your orders from your dashboard:
{{dashboard_url}}' WHERE template_key = 'mentor.new_order';

UPDATE public.notification_templates SET subject_en = 'New subscription to {{plan_title}}', body_en = 'Hi {{mentor_name}},

{{student_name}} just subscribed to your plan ({{plan_title}}) for {{amount}} EGP.

Subscription details are available in your dashboard.' WHERE template_key = 'mentor.new_subscription';

UPDATE public.notification_templates SET subject_en = 'Order {{order_id}} cancelled', body_en = 'Hi {{mentor_name}},

Order {{order_id}} from {{student_name}} for {{product_title}} ({{amount}} EGP) has been cancelled.' WHERE template_key = 'mentor.order_cancelled';

UPDATE public.notification_templates SET subject_en = 'Welcome to ebdaey, {{mentor_name}} 👋', body_en = 'Hi {{mentor_name}},

We''re happy to have you on ebdaey.

Your dashboard:
{{dashboard_url}}

Your public page:
{{public_url}}

Looking forward to seeing your work 💚' WHERE template_key = 'mentor.welcome';

UPDATE public.notification_templates SET subject_en = 'Withdrawal request approved ✅', body_en = 'Hi {{mentor_name}},

Your withdrawal request of {{amount}} EGP has been approved. The amount will be transferred within 24-48 hours.' WHERE template_key = 'mentor.withdrawal_approved';

UPDATE public.notification_templates SET subject_en = 'Please update your withdrawal details', body_en = 'Hi {{mentor_name}},

We need you to update some details on your withdrawal request of {{amount}} EGP.

Note: {{note}}

Please open your dashboard to update the details.' WHERE template_key = 'mentor.withdrawal_edited';

UPDATE public.notification_templates SET subject_en = 'Withdrawal request rejected', body_en = 'Hi {{mentor_name}},

Unfortunately your withdrawal request of {{amount}} EGP has been rejected.

Reason: {{reason}}

For any questions please contact support.' WHERE template_key = 'mentor.withdrawal_rejected';

UPDATE public.notification_templates SET subject_en = 'Your balance has been sent 💰', body_en = 'Hi {{mentor_name}},

{{amount}} EGP has been transferred to your bank account successfully.

Reference: {{reference}}' WHERE template_key = 'mentor.withdrawal_sent';

UPDATE public.notification_templates SET subject_en = 'Reminder: your session with {{mentor_name}} in 1 hour', body_en = 'Hi {{student_name}},

This is a reminder of your consultation with {{mentor_name}} at {{start_time}}.

Session link:
{{meeting_url}}' WHERE template_key = 'student.consultation_reminder';
