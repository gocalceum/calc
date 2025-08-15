# HMRC OAuth2 and Business Details API Integration Plan

## Overview
Implement HMRC Making Tax Digital (MTD) OAuth2 authentication and business details API integration with support for multiple HMRC businesses per entity. The solution uses Supabase Edge Functions for secure backend processing and React/TypeScript for the frontend.

## Key Requirements
- **One-to-Many Relationship**: Single entity (e.g., sole trader) can have multiple HMRC businesses (sole trader, landlord, freelancer)
- **Secure Backend**: Use Supabase Edge Functions for OAuth2 flow and API calls
- **Multi-Business Management**: UI to manage and sync multiple HMRC businesses per entity

## Architecture

### Data Model
```sql
-- New table: hmrc_connections (one-to-many with entities)
CREATE TABLE public.hmrc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  
  -- HMRC identifiers
  hmrc_business_id TEXT NOT NULL,
  business_type TEXT CHECK (business_type IN ('sole_trader', 'landlord', 'freelancer', 'partnership', 'limited_company')),
  business_name TEXT,
  
  -- Tax identifiers
  nino TEXT, -- National Insurance Number
  utr TEXT,  -- Unique Taxpayer Reference
  vat_registration_number TEXT,
  
  -- OAuth tokens (encrypted)
  oauth_tokens JSONB, -- {access_token, refresh_token, expires_at}
  oauth_scopes TEXT[],
  
  -- Sync metadata
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  
  -- Business details cache
  business_details JSONB,
  obligations JSONB,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(entity_id, hmrc_business_id)
);

-- Audit log for HMRC operations
CREATE TABLE public.hmrc_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES hmrc_connections(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  endpoint TEXT,
  request_data JSONB,
  response_data JSONB,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### Supabase Edge Functions Structure
```
/supabase/functions/
├── hmrc-auth-initiate/      # Start OAuth2 flow
├── hmrc-auth-callback/      # Handle OAuth2 callback
├── hmrc-token-refresh/      # Refresh expired tokens
├── hmrc-list-businesses/    # Get all businesses for user
├── hmrc-sync-business/      # Sync specific business details
├── hmrc-get-obligations/    # Retrieve tax obligations
└── hmrc-common/            # Shared utilities
    ├── encryption.ts       # Token encryption/decryption
    ├── hmrc-client.ts     # HMRC API client
    └── types.ts           # Shared TypeScript types
```

### Frontend Components Structure
```
/frontend/src/pages/hmrc/
├── HMRCDashboard.tsx           # Main HMRC section page
├── HMRCConnect.tsx             # OAuth2 connection flow
├── HMRCCallback.tsx            # OAuth2 callback handler
├── HMRCBusinessList.tsx        # List all HMRC businesses
├── HMRCBusinessDetail.tsx      # Individual business details
├── HMRCBusinessLink.tsx        # Link HMRC business to entity
├── HMRCObligations.tsx         # View tax obligations
└── HMRCSettings.tsx            # Connection settings

/frontend/src/components/hmrc/
├── BusinessCard.tsx            # HMRC business display card
├── ConnectionStatus.tsx        # OAuth connection status
├── SyncButton.tsx              # Manual sync trigger
└── ObligationsList.tsx         # Tax obligations display

/frontend/src/hooks/
├── useHMRCAuth.ts              # OAuth2 authentication hook
├── useHMRCBusinesses.ts        # Business data management
└── useHMRCSync.ts              # Sync operations

/frontend/src/types/
└── hmrc.types.ts               # TypeScript definitions
```

## Implementation Checklist

### Phase 1: Database & Backend Setup ⬜
- [ ] Create database migration for `hmrc_connections` table
- [ ] Create database migration for `hmrc_audit_logs` table
- [ ] Add RLS policies for HMRC tables
- [ ] Create indexes for performance optimization
- [ ] Set up encryption keys in Supabase vault

### Phase 2: Supabase Edge Functions ⬜
- [ ] Implement `hmrc-auth-initiate` function
  - [ ] Generate state parameter for CSRF protection
  - [ ] Build authorization URL with correct scopes
  - [ ] Store state in temporary table
- [ ] Implement `hmrc-auth-callback` function
  - [ ] Validate state parameter
  - [ ] Exchange code for tokens
  - [ ] Encrypt and store tokens
  - [ ] Retrieve user's HMRC businesses
- [ ] Implement `hmrc-token-refresh` function
  - [ ] Check token expiry
  - [ ] Refresh using refresh token
  - [ ] Update stored tokens
- [ ] Implement `hmrc-list-businesses` function
  - [ ] Call HMRC List All Businesses endpoint
  - [ ] Parse and format response
  - [ ] Cache results
- [ ] Implement `hmrc-sync-business` function
  - [ ] Retrieve business details
  - [ ] Update local cache
  - [ ] Log audit trail
- [ ] Implement `hmrc-get-obligations` function
  - [ ] Fetch tax obligations
  - [ ] Format for frontend display
- [ ] Create shared utilities
  - [ ] Token encryption/decryption
  - [ ] HMRC API client wrapper
  - [ ] Error handling utilities
  - [ ] Rate limiting logic

### Phase 3: Frontend - Navigation & Routing ⬜
- [ ] Add HMRC icon to sidebar navigation
- [ ] Create HMRC routes in App.tsx
- [ ] Set up route guards for authentication
- [ ] Add breadcrumb navigation

### Phase 4: Frontend - OAuth2 Flow ⬜
- [ ] Create HMRCConnect component
  - [ ] "Connect to HMRC" button
  - [ ] Scope selection UI
  - [ ] Loading states
- [ ] Create HMRCCallback component
  - [ ] Handle success/error from OAuth
  - [ ] Display connection status
  - [ ] Redirect to business list
- [ ] Implement connection status indicator
  - [ ] Show in sidebar
  - [ ] Display token expiry
  - [ ] Auto-refresh mechanism

### Phase 5: Frontend - Business Management ⬜
- [ ] Create HMRCDashboard component
  - [ ] Overview of all connections
  - [ ] Quick actions menu
  - [ ] Sync status summary
- [ ] Create HMRCBusinessList component
  - [ ] Display all HMRC businesses
  - [ ] Filter by business type
  - [ ] Search functionality
  - [ ] Bulk sync operations
- [ ] Create HMRCBusinessDetail component
  - [ ] Show full business details
  - [ ] Display tax obligations
  - [ ] Manual sync button
  - [ ] Edit connection settings
- [ ] Create HMRCBusinessLink component
  - [ ] Link HMRC business to entity
  - [ ] Unlink functionality
  - [ ] Conflict resolution UI

### Phase 6: Frontend - Data Synchronization ⬜
- [ ] Implement sync status indicators
  - [ ] Real-time progress updates
  - [ ] Error state handling
  - [ ] Retry mechanisms
- [ ] Create sync history view
  - [ ] Show audit logs
  - [ ] Filter by date/status
  - [ ] Export functionality
- [ ] Add automatic sync scheduling
  - [ ] Daily/weekly options
  - [ ] Notification preferences

### Phase 7: Security & Compliance ⬜
- [ ] Implement token encryption
  - [ ] AES-256 encryption
  - [ ] Secure key management
  - [ ] Token rotation policy
- [ ] Add comprehensive audit logging
  - [ ] Log all API calls
  - [ ] Track data changes
  - [ ] User action logging
- [ ] Implement rate limiting
  - [ ] Respect HMRC API limits
  - [ ] Queue management
  - [ ] Retry with backoff
- [ ] Add data retention policies
  - [ ] Token expiry cleanup
  - [ ] Audit log archival
  - [ ] Cache invalidation

### Phase 8: Testing ⬜
- [ ] Unit tests for Edge Functions
  - [ ] Mock HMRC API responses
  - [ ] Test error scenarios
  - [ ] Validate encryption
- [ ] Integration tests
  - [ ] Full OAuth2 flow
  - [ ] Token refresh cycle
  - [ ] Business sync operations
- [ ] Frontend component tests
  - [ ] User interaction flows
  - [ ] Error state rendering
  - [ ] Loading states
- [ ] End-to-end tests
  - [ ] Complete user journey
  - [ ] Multi-business scenarios
  - [ ] Error recovery

### Phase 9: Environment Configuration ⬜
- [ ] Set up environment variables
  ```env
  # Supabase Edge Functions
  HMRC_CLIENT_ID=
  HMRC_CLIENT_SECRET=
  HMRC_REDIRECT_URI=
  HMRC_API_BASE_URL=
  ENCRYPTION_KEY=
  
  # Frontend
  VITE_SUPABASE_HMRC_FUNCTIONS_URL=
  ```
- [ ] Configure for sandbox environment
- [ ] Configure for production environment
- [ ] Set up secrets in GitHub Actions
- [ ] Document environment setup

### Phase 10: Documentation ⬜
- [ ] API documentation
  - [ ] Edge Function endpoints
  - [ ] Request/response formats
  - [ ] Error codes
- [ ] User guide
  - [ ] Connection setup
  - [ ] Business management
  - [ ] Troubleshooting
- [ ] Developer documentation
  - [ ] Architecture overview
  - [ ] Deployment guide
  - [ ] Contributing guidelines

### Phase 11: Deployment ⬜
- [ ] Deploy Edge Functions to Supabase
- [ ] Run database migrations
- [ ] Update frontend build
- [ ] Configure production OAuth2 redirect
- [ ] Monitor initial connections
- [ ] Set up alerting

### Phase 12: Post-Launch ⬜
- [ ] Monitor API usage
- [ ] Collect user feedback
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Feature enhancements

## Security Considerations

### Token Management
- Encrypt OAuth tokens using AES-256 before storage
- Implement automatic token refresh before expiry
- Clean up expired tokens regularly
- Never expose tokens to frontend

### API Security
- All HMRC API calls through Edge Functions
- Validate user permissions before API access
- Implement request signing where required
- Rate limit to prevent abuse

### Data Protection
- Follow GDPR requirements for tax data
- Implement data retention policies
- Provide data export functionality
- Enable audit trail for compliance

## Error Handling Strategy

### OAuth2 Errors
- Invalid grant: Clear tokens and re-authenticate
- Expired tokens: Automatic refresh
- Scope changes: Prompt for re-authorization

### API Errors
- Rate limiting: Implement exponential backoff
- Service unavailable: Queue for retry
- Invalid business: Remove from local cache

### User Experience
- Clear error messages
- Suggested actions for resolution
- Support contact information
- Fallback to manual entry

## Performance Optimizations

### Caching Strategy
- Cache business details for 24 hours
- Cache obligations for 1 hour
- Invalidate on manual sync
- Background refresh for active users

### Database Optimization
- Index on entity_id and hmrc_business_id
- Partition audit logs by month
- Archive old sync data
- Vacuum regularly

### Frontend Optimization
- Lazy load HMRC components
- Paginate business lists
- Virtual scrolling for large datasets
- Debounce search inputs

## Success Metrics

### Technical Metrics
- OAuth2 connection success rate > 95%
- API call success rate > 99%
- Token refresh success rate > 99.9%
- Average sync time < 5 seconds

### Business Metrics
- User adoption rate
- Businesses connected per entity
- Time saved vs manual entry
- Error reduction rate

### User Experience Metrics
- Time to first connection < 2 minutes
- Support tickets per connection < 0.1
- User satisfaction score > 4.5/5
- Feature usage analytics

## Rollout Strategy

### Phase 1: Internal Testing
- Test with team accounts
- Validate all endpoints
- Fix critical bugs

### Phase 2: Beta Users
- Select 10-20 beta users
- Gather feedback
- Iterate on UX

### Phase 3: Gradual Rollout
- 10% of users
- 50% of users
- 100% of users

### Phase 4: Enhancement
- Add advanced features
- Optimize performance
- Expand API coverage

## Maintenance Plan

### Regular Tasks
- Daily: Monitor API errors
- Weekly: Review audit logs
- Monthly: Clean up expired data
- Quarterly: Security review

### Updates
- Track HMRC API changes
- Update documentation
- Implement new endpoints
- Enhance error handling

## Dependencies

### External Services
- HMRC MTD API
- Supabase Edge Functions
- Supabase Database
- Supabase Auth

### NPM Packages
- @supabase/supabase-js
- @supabase/functions-js
- crypto (for encryption)
- date-fns (for date handling)

## Risk Assessment

### High Risk
- HMRC API downtime → Implement offline mode
- Token breach → Encryption and monitoring
- Rate limiting → Queue management

### Medium Risk
- Schema changes → Versioning strategy
- User errors → Comprehensive validation
- Performance issues → Caching and optimization

### Low Risk
- UI bugs → Comprehensive testing
- Documentation gaps → Regular updates
- Feature requests → Prioritization process

## Estimated Timeline

- **Phase 1-2**: 1 week (Database & Edge Functions)
- **Phase 3-6**: 2 weeks (Frontend Implementation)
- **Phase 7-8**: 1 week (Security & Testing)
- **Phase 9-11**: 3 days (Configuration & Deployment)
- **Phase 12**: Ongoing (Post-Launch)

**Total: ~4-5 weeks for MVP**

## Next Steps

1. Review and approve plan
2. Set up HMRC sandbox credentials
3. Create database migrations
4. Begin Edge Function development
5. Start frontend component development

---

*Last Updated: 2025-08-14*
*Version: 1.0*