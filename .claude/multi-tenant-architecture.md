# Multi-Tenant Architecture for Calceum

## Overview
Calceum is designed for accounting firms to manage multiple client entities. The architecture supports a two-tier hierarchy:
- **Organizations** (Accounting Firms)
- **Entities** (Client Businesses: sole traders, freelancers, small businesses, limited companies)

## Use Case
1. Accounting firms sign up and create an organization
2. Each organization can manage multiple client entities
3. Entities represent different business types (sole trader, freelancer, limited company, etc.)
4. Staff members have role-based access to the organization and specific entities
5. All calculations and financial data are scoped to specific entities

## Database Schema

### 1. Core Organization Structure

```sql
-- Accounting firms
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- e.g., 'smith-associates'
  type TEXT DEFAULT 'accounting_firm',
  settings JSONB DEFAULT '{}', -- firm preferences, features enabled
  subscription_tier TEXT DEFAULT 'starter', -- pricing tier
  subscription_status TEXT DEFAULT 'active',
  -- Contact info
  email TEXT,
  phone TEXT,
  address JSONB,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Organization members (accounting firm staff)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'accountant', 'bookkeeper', 'viewer')),
  permissions JSONB DEFAULT '{}', -- granular permissions
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

### 2. Entity Structure (Client Businesses)

```sql
-- Client entities managed by the accounting firm
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  legal_name TEXT, -- Official registered name if different
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'sole_trader', 
    'freelancer', 
    'partnership',
    'limited_company', 
    'llp', -- Limited Liability Partnership
    'charity',
    'other'
  )),
  
  -- Registration details
  company_number TEXT, -- For limited companies
  vat_number TEXT,
  tax_reference TEXT, -- UTR or other tax ID
  incorporation_date DATE,
  year_end DATE, -- Financial year end
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'ceased', 'archived')),
  onboarding_status TEXT DEFAULT 'pending',
  
  -- Contact/Address
  primary_contact JSONB, -- {name, email, phone, position}
  registered_address JSONB,
  trading_address JSONB,
  
  -- Financial settings
  currency TEXT DEFAULT 'GBP',
  vat_scheme TEXT, -- 'standard', 'flat_rate', 'cash', 'none'
  accounting_method TEXT DEFAULT 'accrual', -- or 'cash'
  
  -- Metadata
  tags TEXT[], -- ['retail', 'construction', etc.]
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Entity access permissions (which staff can access which entities)
CREATE TABLE public.entity_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT CHECK (permission_level IN ('owner', 'full', 'read_write', 'read_only')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, user_id)
);
```

### 3. Financial Data Structure

```sql
-- Calculations/documents per entity
CREATE TABLE public.calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'vat_return', 'tax_calculation', 'invoice', etc.
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'draft',
  
  data JSONB NOT NULL, -- The actual calculation data
  result JSONB, -- Calculation results
  
  created_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail for compliance
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
  resource_type TEXT NOT NULL, -- 'entity', 'calculation', 'document'
  resource_id UUID,
  
  changes JSONB, -- before/after values
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Profile Extension

```sql
-- Extend the profiles table
ALTER TABLE public.profiles ADD COLUMN current_org_id UUID REFERENCES organizations(id);
ALTER TABLE public.profiles ADD COLUMN current_entity_id UUID REFERENCES entities(id);
```

## Row Level Security (RLS) Policies

```sql
-- Organizations: Users can only see orgs they belong to
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Update own organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Entities: Users can only see entities of their org or with explicit permission
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View entities" ON entities
  FOR SELECT USING (
    -- User belongs to the organization
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    -- User has explicit entity permission
    id IN (
      SELECT entity_id FROM entity_permissions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Create entities" ON entities
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'accountant')
      AND is_active = true
    )
  );

-- Calculations: Inherit entity permissions
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View calculations" ON calculations
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities -- This will trigger entity RLS
    )
  );

CREATE POLICY "Create calculations" ON calculations
  FOR INSERT WITH CHECK (
    entity_id IN (
      SELECT entity_id FROM entity_permissions 
      WHERE user_id = auth.uid()
      AND permission_level IN ('owner', 'full', 'read_write')
    )
  );
```

## Helper Functions

```sql
-- Get user's current organization
CREATE OR REPLACE FUNCTION get_current_org()
RETURNS UUID AS $$
  SELECT current_org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Switch organization context
CREATE OR REPLACE FUNCTION switch_organization(org_id UUID)
RETURNS void AS $$
  UPDATE profiles 
  SET current_org_id = org_id,
      current_entity_id = NULL -- Reset entity when switching org
  WHERE id = auth.uid()
  AND org_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Switch entity context
CREATE OR REPLACE FUNCTION switch_entity(entity_id UUID)
RETURNS void AS $$
  UPDATE profiles 
  SET current_entity_id = entity_id
  WHERE id = auth.uid()
  AND entity_id IN (
    SELECT id FROM entities WHERE id = entity_id
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Get entities user can access
CREATE OR REPLACE FUNCTION get_accessible_entities()
RETURNS SETOF entities AS $$
  SELECT DISTINCT e.*
  FROM entities e
  LEFT JOIN entity_permissions ep ON e.id = ep.entity_id
  WHERE 
    -- Via organization membership
    e.organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    -- Via direct entity permission
    ep.user_id = auth.uid()
  ORDER BY e.name
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has permission for entity
CREATE OR REPLACE FUNCTION has_entity_permission(
  entity_id UUID, 
  required_permission TEXT DEFAULT 'read_only'
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM entity_permissions ep
    JOIN entities e ON ep.entity_id = e.id
    WHERE ep.entity_id = $1
    AND ep.user_id = auth.uid()
    AND (
      ep.permission_level = 'owner' OR
      ep.permission_level = 'full' OR
      (ep.permission_level = 'read_write' AND $2 IN ('read_write', 'read_only')) OR
      (ep.permission_level = 'read_only' AND $2 = 'read_only')
    )
  )
  OR EXISTS (
    SELECT 1 FROM entities e
    JOIN organization_members om ON e.organization_id = om.organization_id
    WHERE e.id = $1
    AND om.user_id = auth.uid()
    AND om.is_active = true
    AND om.role IN ('owner', 'admin', 'accountant')
  )
$$ LANGUAGE sql SECURITY DEFINER;
```

## Frontend Implementation

### 1. User Flows

#### Signup Flow
```
1. User signs up with email/password or OAuth
2. Email verification
3. Create Organization form
   - Organization name
   - Organization type (accounting firm)
   - Contact details
4. User automatically assigned as 'owner' role
5. Redirect to entity creation or import wizard
```

#### Daily Workflow
```
1. Login
2. If multiple orgs: Show org selector
3. Load organization dashboard
4. View list of entities
5. Select entity to work on
6. Perform calculations/tasks for that entity
7. Switch between entities as needed
```

### 2. React Context Structure

```typescript
// Types
interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  subscription_tier: string;
}

interface Entity {
  id: string;
  organization_id: string;
  name: string;
  legal_name?: string;
  entity_type: 'sole_trader' | 'freelancer' | 'limited_company' | 'partnership' | 'llp' | 'charity' | 'other';
  vat_number?: string;
  company_number?: string;
  status: 'active' | 'dormant' | 'ceased' | 'archived';
}

interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'accountant' | 'bookkeeper' | 'viewer';
  permissions: Record<string, boolean>;
}

// Context Providers
<AuthProvider>
  <OrganizationProvider>
    <EntityProvider>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </EntityProvider>
  </OrganizationProvider>
</AuthProvider>
```

### 3. Component Structure

```typescript
// Organization Selector
const OrganizationSelector = () => {
  const { organizations, currentOrg, switchOrg } = useOrganization();
  // Dropdown to switch between organizations
};

// Entity Selector/Switcher
const EntitySwitcher = () => {
  const { entities, currentEntity, switchEntity } = useEntity();
  // Dropdown or sidebar list to switch entities
};

// Permission Guard
const PermissionGuard = ({ 
  children, 
  requiredRole, 
  requiredPermission 
}: PermissionGuardProps) => {
  const { hasPermission } = usePermissions();
  if (!hasPermission(requiredRole, requiredPermission)) {
    return <AccessDenied />;
  }
  return children;
};
```

### 4. Navigation Structure

```
/                           - Landing page
/login                      - Login
/signup                     - Signup
/onboarding                 - Organization setup wizard

[Authenticated Routes]
/dashboard                  - Organization overview
  - Stats: total entities, active calculations, deadlines
  - Recent activity across all entities
  - Quick actions

/entities                   - Entity management
  /entities/new            - Create new entity
  /entities/:id            - Entity detail/overview
  /entities/:id/edit       - Edit entity details
  /entities/:id/calculations - Entity calculations
  /entities/:id/vat        - VAT returns
  /entities/:id/tax        - Tax calculations
  /entities/:id/documents  - Document management
  /entities/:id/settings   - Entity-specific settings

/team                      - Team management
  /team/invite            - Invite team members
  /team/members           - List/manage members
  /team/roles             - Role management

/reports                   - Cross-entity reporting
  /reports/vat-summary    - VAT summary across entities
  /reports/deadlines      - Upcoming deadlines
  /reports/activity       - Activity log

/settings                  - Organization settings
  /settings/organization  - Org details
  /settings/billing       - Subscription & billing
  /settings/integrations  - Third-party integrations
  /settings/api-keys      - API key management

/profile                   - User profile settings
```

## API Structure

### Supabase Client Initialization

```typescript
// Enhanced Supabase client with org context
export const createSupabaseClient = (orgId?: string, entityId?: string) => {
  const client = createClient();
  
  // Add org context to all queries
  if (orgId) {
    client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Store in session for RLS policies
        session.user.app_metadata = {
          ...session.user.app_metadata,
          current_org_id: orgId,
          current_entity_id: entityId
        };
      }
    });
  }
  
  return client;
};
```

### API Endpoints Structure

```typescript
// Organization APIs
const orgApi = {
  create: (data: CreateOrgData) => 
    supabase.from('organizations').insert(data),
  
  getMyOrgs: () => 
    supabase.from('organizations')
      .select('*, organization_members!inner(role)')
      .eq('organization_members.user_id', userId),
  
  switchOrg: (orgId: string) => 
    supabase.rpc('switch_organization', { org_id: orgId })
};

// Entity APIs
const entityApi = {
  list: (orgId: string) => 
    supabase.from('entities')
      .select('*')
      .eq('organization_id', orgId)
      .order('name'),
  
  create: (data: CreateEntityData) => 
    supabase.from('entities').insert({
      ...data,
      organization_id: currentOrgId
    }),
  
  getAccessible: () => 
    supabase.rpc('get_accessible_entities')
};

// Calculation APIs (scoped to entity)
const calculationApi = {
  list: (entityId: string) => 
    supabase.from('calculations')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false }),
  
  create: (entityId: string, data: CalculationData) => 
    supabase.from('calculations').insert({
      ...data,
      entity_id: entityId,
      organization_id: currentOrgId
    })
};
```

## Security Considerations

### 1. Data Isolation
- All data access goes through RLS policies
- Organization data is completely isolated
- Entity data can be shared via explicit permissions
- Audit logs track all access

### 2. Permission Levels

#### Organization Roles
- **Owner**: Full control, billing, can delete org
- **Admin**: Manage team, entities, settings
- **Accountant**: Create/edit entities and calculations
- **Bookkeeper**: Edit calculations, limited entity access
- **Viewer**: Read-only access

#### Entity Permissions
- **Owner**: Full control of entity
- **Full**: All operations except delete
- **Read/Write**: View and edit, no settings
- **Read Only**: View only

### 3. Compliance Features
- Audit trail for all data access
- Data retention policies
- GDPR compliance (data export/deletion)
- Role-based access control (RBAC)

## Migration Strategy

### Phase 1: Schema Setup (Week 1)
1. Create all tables with RLS policies
2. Create helper functions
3. Test RLS policies thoroughly
4. Create migration scripts for existing data

### Phase 2: Authentication Updates (Week 2)
1. Update signup flow to create organization
2. Modify login to load org context
3. Add organization/entity switchers
4. Update profile management

### Phase 3: Frontend Migration (Week 3-4)
1. Create context providers
2. Update navigation structure
3. Build entity management pages
4. Add permission guards to existing pages
5. Update all queries to include org/entity context

### Phase 4: Feature Updates (Week 5-6)
1. Update calculation pages for entity context
2. Add team management
3. Implement audit logging
4. Add billing/subscription management

### Phase 5: Testing & Refinement (Week 7-8)
1. Comprehensive testing of permissions
2. Performance optimization
3. User acceptance testing
4. Documentation

## Future Enhancements

### 1. Advanced Features
- **Client Portal**: Limited access for entity owners
- **Bulk Operations**: Mass updates across entities
- **Templates**: Entity and calculation templates
- **Workflow Automation**: Approval chains, reminders

### 2. Integrations
- **Accounting Software**: Xero, QuickBooks, Sage
- **Banking**: Open Banking API integration
- **Government**: HMRC API for submissions
- **Document Management**: Google Drive, Dropbox

### 3. Analytics & Reporting
- **Cross-entity dashboards**
- **Benchmarking between entities**
- **Predictive analytics**
- **Custom report builder**

### 4. Compliance & Automation
- **Deadline management**: Automatic reminders
- **Document generation**: Auto-create returns
- **Compliance checking**: Validate before submission
- **Filing automation**: Direct submission to HMRC

## Performance Considerations

### 1. Database Optimization
- Index foreign keys (organization_id, entity_id)
- Partition large tables by organization
- Use materialized views for complex queries
- Implement caching for frequently accessed data

### 2. Query Optimization
```sql
-- Index for common queries
CREATE INDEX idx_entities_org ON entities(organization_id);
CREATE INDEX idx_calculations_entity ON calculations(entity_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_audit_logs_org_entity ON audit_logs(organization_id, entity_id);
```

### 3. Frontend Optimization
- Lazy load entity data
- Cache organization/entity lists
- Implement pagination for large datasets
- Use React Query for data fetching

## Monitoring & Analytics

### 1. Key Metrics to Track
- Active organizations
- Entities per organization
- Calculations per entity
- User engagement per role
- Feature adoption rates

### 2. Audit Requirements
- Track all data access
- Log permission changes
- Monitor failed access attempts
- Regular security audits

### 3. Performance Monitoring
- Query performance
- API response times
- RLS policy evaluation time
- Cache hit rates

## Cost Considerations

### 1. Pricing Model Options
- **Per Organization**: Flat fee per accounting firm
- **Per Entity**: Scale with number of clients
- **Per User**: Based on team size
- **Usage-based**: Calculations/transactions
- **Hybrid**: Base fee + usage

### 2. Resource Planning
- Database storage per entity
- Compute resources for calculations
- File storage for documents
- Bandwidth for client portal

## Documentation Requirements

### 1. Technical Documentation
- Database schema diagram
- API documentation
- RLS policy documentation
- Migration guides

### 2. User Documentation
- Organization admin guide
- Entity management guide
- Permission system explanation
- Best practices guide

### 3. Compliance Documentation
- Data protection policies
- Access control documentation
- Audit trail explanation
- Backup and recovery procedures