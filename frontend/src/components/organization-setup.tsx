import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, Zap } from 'lucide-react'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export function OrganizationSetup() {
  const navigate = useNavigate()
  useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }

  const handleQuickSetup = async () => {
    if (!formData.name.trim()) {
      setError('Please enter your organization name')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const slug = generateSlug(formData.name)

      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', slug)
        .single()

      const finalSlug = existingOrg ? `${slug}-${Date.now().toString(36)}` : slug

      const { data: orgData, error: createError } = await supabase.rpc(
        'create_organization_with_owner',
        {
          org_name: formData.name,
          org_slug: finalSlug,
          org_type: 'accounting_firm',
        }
      )

      if (createError) throw createError

      if (formData.email || formData.phone) {
        await supabase
          .from('organizations')
          .update({
            email: formData.email || null,
            phone: formData.phone || null,
          })
          .eq('id', orgData)
      }

      navigate('/dashboard')
    } catch (err) {
      console.error('Error creating organization:', err)
      setError(err.message || 'Failed to create organization')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDetailedSetup = () => {
    navigate('/onboarding/detailed')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Welcome to Calceum</CardTitle>
          <CardDescription className="text-center">
            Let&apos;s set up your accounting firm in seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              placeholder="Smith & Associates"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Contact Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@smithassociates.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 20 1234 5678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            className="w-full"
            onClick={handleQuickSetup}
            disabled={isLoading || !formData.name.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Quick Setup
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDetailedSetup}
            disabled={isLoading}
          >
            I want more options
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            You can always update these details later in settings
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
