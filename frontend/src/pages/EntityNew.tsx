import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEntity } from '@/contexts/EntityContext'
import { useOrganization } from '@/contexts/OrganizationContext'

const entityTypes = [
  { value: 'sole_trader', label: 'Sole Trader' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'llp', label: 'Limited Liability Partnership' },
  { value: 'charity', label: 'Charity' },
  { value: 'other', label: 'Other' },
]

const vatSchemes = [
  { value: 'none', label: 'Not VAT Registered' },
  { value: 'standard', label: 'Standard VAT Scheme' },
  { value: 'flat_rate', label: 'Flat Rate Scheme' },
  { value: 'cash', label: 'Cash Accounting Scheme' },
]

export default function EntityNew() {
  const navigate = useNavigate()
  const { createEntity } = useEntity()
  const { currentOrganization } = useOrganization()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    entity_type: 'sole_trader',
    company_number: '',
    vat_number: '',
    tax_reference: '',
    year_end: '',
    vat_scheme: 'none',
    notes: '',
    primary_contact: {
      name: '',
      email: '',
      phone: '',
    },
    registered_address: {
      line1: '',
      line2: '',
      city: '',
      postcode: '',
      country: 'UK',
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('Entity name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const entityData = {
        name: formData.name,
        legal_name: formData.legal_name || null,
        entity_type: formData.entity_type,
        company_number: formData.company_number || null,
        vat_number: formData.vat_number || null,
        tax_reference: formData.tax_reference || null,
        year_end: formData.year_end || null,
        vat_scheme: formData.vat_scheme === 'none' ? null : formData.vat_scheme,
        notes: formData.notes || null,
        primary_contact: formData.primary_contact.name ? formData.primary_contact : null,
        registered_address: formData.registered_address.line1 ? formData.registered_address : null,
        status: 'active',
        onboarding_status: 'pending',
      }

      const newEntity = await createEntity(entityData)
      navigate(`/entities/${newEntity.id}`)
    } catch (err) {
      console.error('Error creating entity:', err)
      setError(err.message || 'Failed to create entity')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/entities')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add New Entity</h1>
        <p className="text-muted-foreground mt-1">
          Add a new client business to {currentOrganization?.name}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential details about the entity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Entity Name *</Label>
                <Input
                  id="name"
                  placeholder="ABC Limited"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal Name</Label>
                <Input
                  id="legal_name"
                  placeholder="ABC Limited (if different)"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity_type">Entity Type *</Label>
                <Select
                  value={formData.entity_type}
                  onValueChange={(value) => setFormData({ ...formData, entity_type: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_number">Company Number</Label>
                <Input
                  id="company_number"
                  placeholder="12345678"
                  value={formData.company_number}
                  onChange={(e) => setFormData({ ...formData, company_number: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
            <CardDescription>VAT and tax details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vat_scheme">VAT Scheme</Label>
                <Select
                  value={formData.vat_scheme}
                  onValueChange={(value) => setFormData({ ...formData, vat_scheme: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vatSchemes.map((scheme) => (
                      <SelectItem key={scheme.value} value={scheme.value}>
                        {scheme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat_number">VAT Number</Label>
                <Input
                  id="vat_number"
                  placeholder="GB123456789"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  disabled={isLoading || formData.vat_scheme === 'none'}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tax_reference">Tax Reference (UTR)</Label>
                <Input
                  id="tax_reference"
                  placeholder="1234567890"
                  value={formData.tax_reference}
                  onChange={(e) => setFormData({ ...formData, tax_reference: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_end">Year End Date</Label>
                <Input
                  id="year_end"
                  type="date"
                  value={formData.year_end}
                  onChange={(e) => setFormData({ ...formData, year_end: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Primary contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  placeholder="John Smith"
                  value={formData.primary_contact.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primary_contact: { ...formData.primary_contact, name: e.target.value },
                    })
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.primary_contact.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primary_contact: { ...formData.primary_contact, email: e.target.value },
                    })
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="+44 20 1234 5678"
                value={formData.primary_contact.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    primary_contact: { ...formData.primary_contact, phone: e.target.value },
                  })
                }
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Additional information about this entity</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any special requirements or notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={isLoading}
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/entities')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Entity'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
