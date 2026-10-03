-- Add mentor balance settlement email template to the admin notifications registry.
INSERT INTO public.notification_templates (
  template_key,
  category,
  display_name,
  description,
  subject,
  body,
  variables,
  enabled,
  default_subject,
  default_body
) VALUES (
  'mentor.balance_settlement',
  'mentor',
  'تسوية رصيد المنتور',
  'يُرسل تلقائياً للمنتور بعد تأكيد التسوية البنكية من الإدارة',
  'تمت تسوية رصيدك — {{amount}} ج.م',
  'مرحباً {{mentor_name}}،

قامت المنصة بتنفيذ تسوية رصيدك وتحويله بنكياً إلى حسابك البنكي المعتمد.

المبلغ المحوّل: {{amount}} ج.م

سيصلك المبلغ على حسابك البنكي حسب المدة المعتادة لدى البنك، وتم تصفير رصيدك في لوحة التحكم.

افتح لوحة التحكم: https://app.ebdaey.com/',
  '["mentor_name", "amount"]'::jsonb,
  true,
  'تمت تسوية رصيدك — {{amount}} ج.م',
  'مرحباً {{mentor_name}}،

قامت المنصة بتنفيذ تسوية رصيدك وتحويله بنكياً إلى حسابك البنكي المعتمد.

المبلغ المحوّل: {{amount}} ج.م

سيصلك المبلغ على حسابك البنكي حسب المدة المعتادة لدى البنك، وتم تصفير رصيدك في لوحة التحكم.

افتح لوحة التحكم: https://app.ebdaey.com/'
)
ON CONFLICT (template_key) DO UPDATE SET
  category = EXCLUDED.category,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  variables = EXCLUDED.variables,
  default_subject = EXCLUDED.default_subject,
  default_body = EXCLUDED.default_body;
