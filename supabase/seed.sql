-- Seed data for local development
-- This file is run automatically when you run `supabase db reset`

-- Create a test user (password: test123456)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  '$2a$10$3fLC2lKVfxHjZYB0F9Wkge.c1bLV0SqeVsYlTakZXTKxQXPZLw4/m', -- test123456
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Create a profile for the test user
INSERT INTO public.profiles (id, username, website, avatar_url, updated_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'testuser',
  'https://example.com',
  'https://avatars.githubusercontent.com/u/1',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  website = EXCLUDED.website,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = EXCLUDED.updated_at;