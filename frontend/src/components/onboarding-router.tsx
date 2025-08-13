import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface OnboardingRouterProps {
  children: React.ReactNode
}

const PUBLIC_PATHS = ['/login', '/signup', '/reset-password', '/forgot-password', '/auth']
const ONBOARDING_PATHS = ['/onboarding', '/onboarding/detailed']

export function OnboardingRouter({ children }: OnboardingRouterProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { organizations, isLoading } = useOrganization()

  useEffect(() => {
    // Skip if still loading or no user
    if (isLoading || !user) return

    const isPublicPath = PUBLIC_PATHS.some((path) => location.pathname.startsWith(path))
    const isOnboardingPath = ONBOARDING_PATHS.some((path) => location.pathname.startsWith(path))

    // Only redirect if we're not on a public path
    if (!isPublicPath) {
      // Check if user has ANY organizations
      const hasOrganizations = organizations && organizations.length > 0

      if (!hasOrganizations && !isOnboardingPath) {
        navigate('/onboarding', { replace: true })
      } else if (hasOrganizations && isOnboardingPath) {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [organizations, isLoading, location.pathname, navigate, user])

  // Only show loading on initial load, not on navigation
  if (isLoading && user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
