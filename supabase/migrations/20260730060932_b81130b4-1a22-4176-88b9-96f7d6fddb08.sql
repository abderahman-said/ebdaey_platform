CREATE POLICY "Mentors can delete own tenant enrollments"
ON public.enrollments FOR DELETE TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

DELETE FROM public.enrollments e
USING public.orders o
WHERE e.order_id = o.id AND o.payment_status = 'cancelled';