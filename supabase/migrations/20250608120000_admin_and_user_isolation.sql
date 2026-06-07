-- Admin account + reset non-admin sync data
-- Login: admin (or admin@workout.app) / admin2121
-- View data: Supabase Dashboard → Table Editor → user_sync_data

-- Copy legacy workout payload to admin (run after admin user exists)
-- Non-admin rows are cleared so new signups start empty in the cloud.

DO $$
DECLARE
  admin_uid uuid;
  legacy_payload jsonb;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin@workout.app' LIMIT 1;

  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'admin@workout.app',
      crypt('admin2121', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"name":"Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'admin@workout.app'),
      'email',
      admin_uid::text,
      now(), now(), now()
    );
  END IF;

  SELECT payload INTO legacy_payload
  FROM public.user_sync_data
  ORDER BY updated_at DESC
  LIMIT 1;

  IF legacy_payload IS NOT NULL THEN
    INSERT INTO public.user_sync_data (user_id, payload, updated_at)
    VALUES (admin_uid, legacy_payload, now())
    ON CONFLICT (user_id) DO UPDATE
      SET payload = EXCLUDED.payload, updated_at = now();
  END IF;

  UPDATE public.user_sync_data
  SET payload = jsonb_build_object(
    'v', 1,
    'hist', '[]'::jsonb,
    'exercises', '[]'::jsonb,
    'profile', jsonb_build_object(
      'profUnit', 'kg',
      'profBodyweight', 80,
      'profGender', 'male',
      'profAge', 30,
      'profName', '',
      'profHandle', '',
      'profRestSecs', 120
    )
  ),
  updated_at = now()
  WHERE user_id <> admin_uid;
END $$;
