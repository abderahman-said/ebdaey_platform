
DO $$
DECLARE
  _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'hello@ebdaey.com';

  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      _uid, 'authenticated', 'authenticated',
      'hello@ebdaey.com', crypt('123456789', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Ebdaey Admin"}'::jsonb
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), _uid, _uid::text,
      jsonb_build_object('sub', _uid::text, 'email', 'hello@ebdaey.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('123456789', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = _uid;
  END IF;

  -- Keep admin role only on hello@ebdaey.com
  DELETE FROM public.user_roles WHERE role = 'admin' AND user_id <> _uid;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure a profile exists for the admin
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (_uid, 'Ebdaey Admin', 'hello@ebdaey.com')
  ON CONFLICT (user_id) DO NOTHING;
END $$;
