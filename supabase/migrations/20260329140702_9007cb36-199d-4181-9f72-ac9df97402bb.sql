
ALTER TABLE public.students ADD COLUMN phone text DEFAULT null;

CREATE OR REPLACE FUNCTION public.handle_mentor_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _slug TEXT;
  _tenant_id UUID;
BEGIN
  -- Mentor signup
  IF NEW.raw_user_meta_data->>'role' = 'mentor' THEN
    _slug := lower(regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'slug', split_part(NEW.email, '@', 1)),
      '[^a-z0-9]', '-', 'g'
    ));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mentor')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.tenants (owner_id, slug, name)
    VALUES (NEW.id, _slug, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  END IF;
  
  -- Student signup
  IF NEW.raw_user_meta_data->>'role' = 'student' THEN
    SELECT id INTO _tenant_id
    FROM public.tenants
    WHERE slug = NEW.raw_user_meta_data->>'tenant_slug'
    LIMIT 1;
    
    IF _tenant_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'student')
      ON CONFLICT DO NOTHING;
      
      INSERT INTO public.students (user_id, tenant_id, full_name, email, phone)
      VALUES (
        NEW.id,
        _tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
