-- Cleanup: Remove test table used for CI/CD pipeline verification

DROP TABLE IF EXISTS public.pipeline_test CASCADE;

-- Confirm the test migration workflow is complete
-- This migration removes the temporary test table created in 20250812075420_add_test_table.sql