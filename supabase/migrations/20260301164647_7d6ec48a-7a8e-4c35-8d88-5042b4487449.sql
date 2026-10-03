
-- Function to create tenant and assign mentor role after mentor signup
CREATE OR REPLACE FUNCTION public.handle_mentor_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug TEXT;
BEGIN
  -- Only process if user signed up with mentor metadata
  IF NEW.raw_user_meta_data->>'role' = 'mentor' THEN
    -- Generate slug from name
    _slug := lower(regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'slug', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      '[^a-z0-9]', '-', 'g'
    ));
    
    -- Assign mentor role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mentor')
    ON CONFLICT DO NOTHING;
    
    -- Create tenant
    INSERT INTO public.tenants (owner_id, slug, name)
    VALUES (
      NEW.id,
      _slug,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
  END IF;
  
  -- If student role
  IF NEW.raw_user_meta_data->>'role' = 'student' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
    
    -- Create student record
    INSERT INTO public.students (user_id, tenant_id, full_name, email)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'tenant_id')::UUID,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, '')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger runs after profile creation trigger
CREATE TRIGGER on_auth_user_created_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_mentor_signup();
