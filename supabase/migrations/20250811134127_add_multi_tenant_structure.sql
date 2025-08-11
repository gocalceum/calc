-- Multi-Tenant Structure for Calceum
-- This migration creates the core tables for organizations and entities

-- 1. Create organizations table (Accounting Firms)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'accounting_firm',
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'paused')),
  
  -- Contact information
  email TEXT,
  phone TEXT,
  address JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create organization members table (Staff)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'accountant', 'bookkeeper', 'viewer')),
  permissions JSONB DEFAULT '{}',
  
  -- Invitation tracking
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 3. Create entities table (Client Businesses)
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic information
  name TEXT NOT NULL,
  legal_name TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'sole_trader', 
    'freelancer', 
    'partnership',
    'limited_company', 
    'llp',
    'charity',
    'other'
  )),
  
  -- Registration details
  company_number TEXT,
  vat_number TEXT,
  tax_reference TEXT,
  incorporation_date DATE,
  year_end DATE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'ceased', 'archived')),
  onboarding_status TEXT DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed')),
  
  -- Contact and address
  primary_contact JSONB DEFAULT '{}',
  registered_address JSONB DEFAULT '{}',
  trading_address JSONB DEFAULT '{}',
  
  -- Financial settings
  currency TEXT DEFAULT 'GBP',
  vat_scheme TEXT CHECK (vat_scheme IN ('standard', 'flat_rate', 'cash', 'none')),
  accounting_method TEXT DEFAULT 'accrual' CHECK (accounting_method IN ('accrual', 'cash')),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Create entity permissions table
CREATE TABLE public.entity_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('owner', 'full', 'read_write', 'read_only')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, user_id)
);

-- 5. Update profiles table to include organization context
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_org_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS current_entity_id UUID REFERENCES entities(id);

-- 6. Create calculations table (if not exists)
CREATE TABLE IF NOT EXISTS public.calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'draft',
  
  data JSONB NOT NULL DEFAULT '{}',
  result JSONB DEFAULT '{}',
  
  created_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'export', 'import')),
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  changes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_created_by ON organizations(created_by);

CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_active ON organization_members(is_active);

CREATE INDEX idx_entities_org_id ON entities(organization_id);
CREATE INDEX idx_entities_status ON entities(status);
CREATE INDEX idx_entities_type ON entities(entity_type);

CREATE INDEX idx_entity_perms_entity_id ON entity_permissions(entity_id);
CREATE INDEX idx_entity_perms_user_id ON entity_permissions(user_id);

CREATE INDEX idx_calculations_entity_id ON calculations(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_calculations_org_id ON calculations(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "Admins can update their organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- RLS Policies for organization_members
CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

CREATE POLICY "Admins can manage organization members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- RLS Policies for entities
CREATE POLICY "Users can view entities in their organizations" ON entities
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    id IN (
      SELECT entity_id FROM entity_permissions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create entities in their organizations" ON entities
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'accountant')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update entities they have access to" ON entities
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'accountant')
      AND is_active = true
    )
    OR
    id IN (
      SELECT entity_id FROM entity_permissions 
      WHERE user_id = auth.uid()
      AND permission_level IN ('owner', 'full', 'read_write')
    )
  );

-- RLS Policies for entity_permissions
CREATE POLICY "Users can view entity permissions" ON entity_permissions
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities
    )
  );

CREATE POLICY "Admins can manage entity permissions" ON entity_permissions
  FOR ALL USING (
    entity_id IN (
      SELECT e.id FROM entities e
      JOIN organization_members om ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

-- RLS Policies for calculations
CREATE POLICY "Users can view calculations" ON calculations
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities
    )
  );

CREATE POLICY "Users can create calculations" ON calculations
  FOR INSERT WITH CHECK (
    entity_id IN (
      SELECT e.id FROM entities e
      LEFT JOIN entity_permissions ep ON e.id = ep.entity_id
      WHERE (
        e.organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid() 
          AND role IN ('owner', 'admin', 'accountant', 'bookkeeper')
          AND is_active = true
        )
        OR (ep.user_id = auth.uid() AND ep.permission_level IN ('owner', 'full', 'read_write'))
      )
    )
  );

CREATE POLICY "Users can update calculations" ON calculations
  FOR UPDATE USING (
    entity_id IN (
      SELECT e.id FROM entities e
      LEFT JOIN entity_permissions ep ON e.id = ep.entity_id
      WHERE (
        e.organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid() 
          AND role IN ('owner', 'admin', 'accountant', 'bookkeeper')
          AND is_active = true
        )
        OR (ep.user_id = auth.uid() AND ep.permission_level IN ('owner', 'full', 'read_write'))
      )
    )
  );

-- RLS Policies for audit_logs (read-only for users)
CREATE POLICY "Users can view audit logs for their organizations" ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Helper functions
CREATE OR REPLACE FUNCTION get_current_org()
RETURNS UUID AS $$
  SELECT current_org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION switch_organization(org_id UUID)
RETURNS void AS $$
  UPDATE profiles 
  SET current_org_id = org_id,
      current_entity_id = NULL
  WHERE id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
  )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION switch_entity(entity_id UUID)
RETURNS void AS $$
  UPDATE profiles 
  SET current_entity_id = entity_id
  WHERE id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM entities e
    LEFT JOIN entity_permissions ep ON e.id = ep.entity_id
    WHERE e.id = entity_id
    AND (
      e.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR ep.user_id = auth.uid()
    )
  )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_accessible_entities()
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  name TEXT,
  entity_type TEXT,
  status TEXT
) AS $$
  SELECT DISTINCT 
    e.id,
    e.organization_id,
    e.name,
    e.entity_type,
    e.status
  FROM entities e
  LEFT JOIN entity_permissions ep ON e.id = ep.entity_id
  WHERE 
    e.organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR ep.user_id = auth.uid()
  ORDER BY e.name
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create organization with owner
CREATE OR REPLACE FUNCTION create_organization_with_owner(
  org_name TEXT,
  org_slug TEXT,
  org_type TEXT DEFAULT 'accounting_firm'
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO organizations (name, slug, type, created_by)
  VALUES (org_name, org_slug, org_type, auth.uid())
  RETURNING id INTO new_org_id;
  
  -- Add the creator as owner
  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (new_org_id, auth.uid(), 'owner', true);
  
  -- Set as current organization
  UPDATE profiles 
  SET current_org_id = new_org_id
  WHERE id = auth.uid();
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON TABLE organizations IS 'Accounting firms using the platform';
COMMENT ON TABLE entities IS 'Client businesses managed by accounting firms';
COMMENT ON TABLE organization_members IS 'Staff members of accounting firms';
COMMENT ON TABLE entity_permissions IS 'Granular access control for entities';
COMMENT ON TABLE audit_logs IS 'Audit trail for compliance and security';