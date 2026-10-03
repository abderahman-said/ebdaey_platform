
CREATE OR REPLACE FUNCTION public.handle_mentor_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _slug TEXT;
  _tenant_id UUID;
  _role TEXT;
  _provider TEXT;
  _full_name TEXT;
BEGIN
  _role := NEW.raw_user_meta_data->>'role';
  _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );

  IF _role IS NULL AND _provider = 'google' THEN
    _role := 'mentor';
  END IF;

  IF _role = 'mentor' THEN
    _slug := lower(regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'slug', split_part(NEW.email, '@', 1)),
      '[^a-z0-9]', '-', 'g'
    ));

    IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug) THEN
      _slug := _slug || '-' || substr(NEW.id::text, 1, 6);
    END IF;

    -- If the user already has a tenant (edge case), skip
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE owner_id = NEW.id) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'mentor')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.tenants (owner_id, slug, name, first_name, last_name, email, phone)
      VALUES (
        NEW.id,
        _slug,
        _full_name,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.email,
        NEW.raw_user_meta_data->>'phone'
      );
    END IF;
  END IF;

  IF _role = 'student' THEN
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
