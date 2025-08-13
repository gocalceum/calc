-- Clear production data while preserving schema
-- WARNING: This will delete all user data!

BEGIN;

-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = replica;

-- Delete in correct order to respect foreign key constraints
-- First delete dependent records
DELETE FROM public.entity_permissions;
DELETE FROM public.calculations;
DELETE FROM public.audit_logs;
DELETE FROM public.entities;
DELETE FROM public.organization_members;
DELETE FROM public.organizations;
DELETE FROM public.profiles;

-- Delete auth users (this will cascade to related auth tables)
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- Verify deletion
SELECT 'Users remaining: ' || COUNT(*) FROM auth.users;
SELECT 'Profiles remaining: ' || COUNT(*) FROM public.profiles;
SELECT 'Organizations remaining: ' || COUNT(*) FROM public.organizations;
SELECT 'Organization members remaining: ' || COUNT(*) FROM public.organization_members;
SELECT 'Entities remaining: ' || COUNT(*) FROM public.entities;