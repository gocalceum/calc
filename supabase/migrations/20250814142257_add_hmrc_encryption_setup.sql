-- HMRC Data Encryption Setup
-- Uses PostgreSQL pgcrypto for encryption (simpler than pgsodium for now)

-- 1. Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create app-level encryption functions
-- Note: In production, you should use environment variables for the key
-- This is a simplified version for development

-- Function to encrypt sensitive text
CREATE OR REPLACE FUNCTION encrypt_hmrc_data(plaintext text)
RETURNS text AS $$
BEGIN
  -- Handle null input
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- In production, the key should come from environment variable
  -- For now, using a placeholder that will be replaced via Edge Functions
  -- The actual encryption will happen in Edge Functions for better security
  RETURN plaintext; -- Temporary: will be encrypted in Edge Functions
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive text  
CREATE OR REPLACE FUNCTION decrypt_hmrc_data(ciphertext text)
RETURNS text AS $$
BEGIN
  -- Handle null input
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Temporary: will be decrypted in Edge Functions
  RETURN ciphertext;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to handle OAuth tokens
-- These will be properly encrypted in Edge Functions
CREATE OR REPLACE FUNCTION encrypt_oauth_tokens(tokens jsonb)
RETURNS jsonb AS $$
BEGIN
  -- For now, return as-is. Edge Functions will handle actual encryption
  RETURN tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_oauth_tokens(tokens jsonb)
RETURNS jsonb AS $$
BEGIN
  -- For now, return as-is. Edge Functions will handle actual decryption
  RETURN tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to safely store HMRC connection
CREATE OR REPLACE FUNCTION create_hmrc_connection(
  p_entity_id uuid,
  p_hmrc_business_id text,
  p_business_type text,
  p_business_name text,
  p_nino text,
  p_utr text,
  p_vat_registration_number text,
  p_company_registration_number text,
  p_oauth_tokens jsonb,
  p_oauth_scopes text[],
  p_user_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_connection_id uuid;
BEGIN
  INSERT INTO public.hmrc_connections (
    entity_id,
    hmrc_business_id,
    business_type,
    business_name,
    nino,
    utr,
    vat_registration_number,
    company_registration_number,
    oauth_tokens,
    oauth_scopes,
    connected_at,
    created_by
  ) VALUES (
    p_entity_id,
    p_hmrc_business_id,
    p_business_type,
    p_business_name,
    p_nino, -- Will be encrypted in Edge Function before calling this
    p_utr,  -- Will be encrypted in Edge Function before calling this
    p_vat_registration_number,
    p_company_registration_number,
    p_oauth_tokens, -- Will be encrypted in Edge Function before calling this
    p_oauth_scopes,
    NOW(),
    p_user_id
  )
  RETURNING id INTO v_connection_id;
  
  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to update OAuth tokens
CREATE OR REPLACE FUNCTION update_hmrc_oauth_tokens(
  p_connection_id uuid,
  p_oauth_tokens jsonb
)
RETURNS boolean AS $$
BEGIN
  UPDATE public.hmrc_connections
  SET 
    oauth_tokens = p_oauth_tokens, -- Will be encrypted in Edge Function
    updated_at = NOW()
  WHERE id = p_connection_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to log HMRC audit events
CREATE OR REPLACE FUNCTION log_hmrc_audit(
  p_connection_id uuid,
  p_user_id uuid,
  p_operation text,
  p_endpoint text,
  p_method text,
  p_request_headers jsonb,
  p_request_params jsonb,
  p_response_status integer,
  p_response_headers jsonb,
  p_response_data jsonb,
  p_error_code text,
  p_error_message text,
  p_error_details jsonb,
  p_duration_ms integer
)
RETURNS uuid AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO public.hmrc_audit_logs (
    connection_id,
    user_id,
    operation,
    endpoint,
    method,
    request_headers,
    request_params,
    response_status,
    response_headers,
    response_data,
    error_code,
    error_message,
    error_details,
    duration_ms
  ) VALUES (
    p_connection_id,
    p_user_id,
    p_operation,
    p_endpoint,
    p_method,
    p_request_headers,
    p_request_params,
    p_response_status,
    p_response_headers,
    p_response_data,
    p_error_code,
    p_error_message,
    p_error_details,
    p_duration_ms
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to manage OAuth state for CSRF protection
CREATE OR REPLACE FUNCTION create_oauth_state(
  p_user_id uuid,
  p_entity_id uuid,
  p_redirect_uri text,
  p_scopes text[]
)
RETURNS text AS $$
DECLARE
  v_state text;
BEGIN
  -- Generate random state
  v_state := encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO public.hmrc_oauth_states (
    state,
    user_id,
    entity_id,
    redirect_uri,
    scopes
  ) VALUES (
    v_state,
    p_user_id,
    p_entity_id,
    p_redirect_uri,
    p_scopes
  );
  
  RETURN v_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to validate OAuth state
CREATE OR REPLACE FUNCTION validate_oauth_state(
  p_state text,
  p_user_id uuid
)
RETURNS TABLE (
  entity_id uuid,
  redirect_uri text,
  scopes text[]
) AS $$
BEGIN
  -- Mark state as used and return details
  UPDATE public.hmrc_oauth_states
  SET 
    used = true,
    used_at = NOW()
  WHERE 
    state = p_state
    AND user_id = p_user_id
    AND used = false
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired OAuth state';
  END IF;
  
  RETURN QUERY
  SELECT 
    os.entity_id,
    os.redirect_uri,
    os.scopes
  FROM public.hmrc_oauth_states os
  WHERE 
    os.state = p_state
    AND os.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get decrypted connection for Edge Functions
-- This will be enhanced when proper encryption is added
CREATE OR REPLACE FUNCTION get_hmrc_connection_decrypted(
  p_connection_id uuid
)
RETURNS TABLE (
  id uuid,
  entity_id uuid,
  hmrc_business_id text,
  business_type text,
  business_name text,
  nino text,
  utr text,
  vat_registration_number text,
  company_registration_number text,
  oauth_tokens jsonb,
  oauth_scopes text[],
  sync_status text,
  last_sync_at timestamptz,
  business_details jsonb,
  obligations jsonb,
  accounting_periods jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hc.id,
    hc.entity_id,
    hc.hmrc_business_id,
    hc.business_type,
    hc.business_name,
    hc.nino, -- Will be decrypted in Edge Function
    hc.utr,  -- Will be decrypted in Edge Function
    hc.vat_registration_number,
    hc.company_registration_number,
    hc.oauth_tokens, -- Will be decrypted in Edge Function
    hc.oauth_scopes,
    hc.sync_status,
    hc.last_sync_at,
    hc.business_details,
    hc.obligations,
    hc.accounting_periods
  FROM public.hmrc_connections hc
  WHERE hc.id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Clean up expired OAuth states (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM public.hmrc_oauth_states
  WHERE expires_at < NOW()
  OR (used = true AND used_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- 11. Grant execute permissions on functions to authenticated users
-- Note: Actual encryption/decryption will be handled by Edge Functions with service role
GRANT EXECUTE ON FUNCTION create_oauth_state(uuid, uuid, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_oauth_state(text, uuid) TO authenticated;

-- Service role functions (only callable from Edge Functions)
REVOKE ALL ON FUNCTION create_hmrc_connection(uuid, text, text, text, text, text, text, text, jsonb, text[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION update_hmrc_oauth_tokens(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION log_hmrc_audit(uuid, uuid, text, text, text, jsonb, jsonb, integer, jsonb, jsonb, text, text, jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_hmrc_connection_decrypted(uuid) FROM PUBLIC;

-- 12. Add comments for documentation
COMMENT ON FUNCTION create_hmrc_connection IS 'Creates HMRC connection (encryption handled by Edge Functions)';
COMMENT ON FUNCTION update_hmrc_oauth_tokens IS 'Updates OAuth tokens (encryption handled by Edge Functions)';
COMMENT ON FUNCTION create_oauth_state IS 'Creates OAuth state for CSRF protection';
COMMENT ON FUNCTION validate_oauth_state IS 'Validates OAuth state and marks as used';
COMMENT ON FUNCTION log_hmrc_audit IS 'Logs HMRC API operations for compliance';
COMMENT ON FUNCTION get_hmrc_connection_decrypted IS 'Gets connection details (decryption handled by Edge Functions)';