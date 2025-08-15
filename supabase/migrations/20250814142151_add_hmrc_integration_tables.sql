-- HMRC Integration Tables for Making Tax Digital
-- Supports multiple HMRC businesses per entity

-- 1. Create hmrc_connections table (one-to-many with entities)
CREATE TABLE public.hmrc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  
  -- HMRC identifiers
  hmrc_business_id TEXT NOT NULL,
  business_type TEXT CHECK (business_type IN (
    'sole_trader', 
    'landlord', 
    'freelancer', 
    'partnership', 
    'limited_company',
    'trust',
    'other'
  )),
  business_name TEXT,
  
  -- Tax identifiers
  nino TEXT, -- National Insurance Number (encrypted)
  utr TEXT,  -- Unique Taxpayer Reference (encrypted)
  vat_registration_number TEXT,
  company_registration_number TEXT,
  
  -- OAuth tokens (encrypted)
  oauth_tokens JSONB, -- {access_token, refresh_token, expires_at, token_type}
  oauth_scopes TEXT[],
  
  -- Sync metadata
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed', 'disconnected')),
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  next_sync_at TIMESTAMPTZ,
  
  -- Business details cache (from HMRC API)
  business_details JSONB,
  obligations JSONB,
  accounting_periods JSONB,
  
  -- Connection metadata
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure unique business per entity
  UNIQUE(entity_id, hmrc_business_id)
);

-- 2. Create hmrc_audit_logs table for compliance
CREATE TABLE public.hmrc_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.hmrc_connections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Operation details
  operation TEXT NOT NULL, -- 'oauth_connect', 'oauth_refresh', 'sync_business', 'api_call', etc.
  endpoint TEXT,
  method TEXT CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  
  -- Request/Response data (sanitized - no sensitive data)
  request_headers JSONB,
  request_params JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_data JSONB,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  
  -- Performance metrics
  duration_ms INTEGER,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create oauth_state table for CSRF protection
CREATE TABLE public.hmrc_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  
  -- OAuth flow data
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  code_verifier TEXT, -- For PKCE if needed
  
  -- Expiry (states expire after 10 minutes)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  
  -- Usage tracking
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_hmrc_connections_entity_id ON public.hmrc_connections(entity_id);
CREATE INDEX idx_hmrc_connections_business_id ON public.hmrc_connections(hmrc_business_id);
CREATE INDEX idx_hmrc_connections_sync_status ON public.hmrc_connections(sync_status);
CREATE INDEX idx_hmrc_connections_is_active ON public.hmrc_connections(is_active);

CREATE INDEX idx_hmrc_audit_logs_connection_id ON public.hmrc_audit_logs(connection_id);
CREATE INDEX idx_hmrc_audit_logs_user_id ON public.hmrc_audit_logs(user_id);
CREATE INDEX idx_hmrc_audit_logs_created_at ON public.hmrc_audit_logs(created_at DESC);
CREATE INDEX idx_hmrc_audit_logs_operation ON public.hmrc_audit_logs(operation);

CREATE INDEX idx_hmrc_oauth_states_state ON public.hmrc_oauth_states(state);
CREATE INDEX idx_hmrc_oauth_states_expires_at ON public.hmrc_oauth_states(expires_at);

-- 5. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_hmrc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Add triggers for updated_at
CREATE TRIGGER hmrc_connections_updated_at
  BEFORE UPDATE ON public.hmrc_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_hmrc_updated_at();

-- 7. Row Level Security (RLS) Policies

-- Enable RLS on tables
ALTER TABLE public.hmrc_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hmrc_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hmrc_oauth_states ENABLE ROW LEVEL SECURITY;

-- HMRC Connections Policies
-- Users can only see HMRC connections for entities they have access to
CREATE POLICY "Users can view HMRC connections for their entities"
  ON public.hmrc_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.entity_permissions ep
      WHERE ep.entity_id = hmrc_connections.entity_id
      AND ep.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.entities e ON e.organization_id = om.organization_id
      WHERE e.id = hmrc_connections.entity_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'accountant')
    )
  );

-- Users can create HMRC connections for entities they have write access to
CREATE POLICY "Users can create HMRC connections for their entities"
  ON public.hmrc_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entity_permissions ep
      WHERE ep.entity_id = hmrc_connections.entity_id
      AND ep.user_id = auth.uid()
      AND ep.permission_level IN ('owner', 'full', 'read_write')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.entities e ON e.organization_id = om.organization_id
      WHERE e.id = hmrc_connections.entity_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'accountant')
    )
  );

-- Users can update HMRC connections for entities they have write access to
CREATE POLICY "Users can update HMRC connections for their entities"
  ON public.hmrc_connections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.entity_permissions ep
      WHERE ep.entity_id = hmrc_connections.entity_id
      AND ep.user_id = auth.uid()
      AND ep.permission_level IN ('owner', 'full', 'read_write')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.entities e ON e.organization_id = om.organization_id
      WHERE e.id = hmrc_connections.entity_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Users can delete HMRC connections for entities they own or admin
CREATE POLICY "Users can delete HMRC connections for their entities"
  ON public.hmrc_connections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.entity_permissions ep
      WHERE ep.entity_id = hmrc_connections.entity_id
      AND ep.user_id = auth.uid()
      AND ep.permission_level = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.entities e ON e.organization_id = om.organization_id
      WHERE e.id = hmrc_connections.entity_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- HMRC Audit Logs Policies
-- Users can only view audit logs for their connections
CREATE POLICY "Users can view audit logs for their HMRC connections"
  ON public.hmrc_audit_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.hmrc_connections hc
      JOIN public.entity_permissions ep ON ep.entity_id = hc.entity_id
      WHERE hc.id = hmrc_audit_logs.connection_id
      AND ep.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hmrc_connections hc
      JOIN public.entities e ON e.id = hc.entity_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE hc.id = hmrc_audit_logs.connection_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'accountant')
    )
  );

-- Only system (via Edge Functions) can insert audit logs
-- This will be handled by service role key in Edge Functions

-- OAuth States Policies
-- Users can only view their own OAuth states
CREATE POLICY "Users can view their own OAuth states"
  ON public.hmrc_oauth_states
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own OAuth states
CREATE POLICY "Users can create their own OAuth states"
  ON public.hmrc_oauth_states
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own OAuth states
CREATE POLICY "Users can update their own OAuth states"
  ON public.hmrc_oauth_states
  FOR UPDATE
  USING (user_id = auth.uid());

-- 8. Clean up expired OAuth states (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM public.hmrc_oauth_states
  WHERE expires_at < NOW()
  OR (used = true AND used_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON TABLE public.hmrc_connections IS 'Stores HMRC MTD API connections for entities, supporting multiple businesses per entity';
COMMENT ON TABLE public.hmrc_audit_logs IS 'Audit trail for all HMRC API operations for compliance';
COMMENT ON TABLE public.hmrc_oauth_states IS 'Temporary storage for OAuth2 state parameters for CSRF protection';

COMMENT ON COLUMN public.hmrc_connections.oauth_tokens IS 'Encrypted OAuth tokens - should never be exposed to frontend';
COMMENT ON COLUMN public.hmrc_connections.nino IS 'National Insurance Number - encrypted at rest';
COMMENT ON COLUMN public.hmrc_connections.utr IS 'Unique Taxpayer Reference - encrypted at rest';