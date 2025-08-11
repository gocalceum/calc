import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
// import { Tables } from '@/lib/database.types'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, MapPin, Phone, Mail, Globe } from 'lucide-react'

// type Entity = Tables<'entities'>

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entity, setEntity] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchEntity = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase.from('entities').select('*').eq('id', id).single()

      if (error) throw error
      setEntity(data)
    } catch (error) {
      console.error('Error fetching entity:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!entity || !confirm('Are you sure you want to delete this entity?')) return

    try {
      const { error } = await supabase.from('entities').delete().eq('id', entity.id)

      if (error) throw error
      navigate('/entities')
    } catch (error) {
      console.error('Error deleting entity:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Entity not found</h2>
          <Button onClick={() => navigate('/entities')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Entities
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/entities">Entities</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{entity.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{entity.name}</h1>
              <p className="text-muted-foreground">
                {entity.entity_type} • {entity.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/entities/${entity.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Entity Information</CardTitle>
                <CardDescription>Basic details about this entity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Entity Type</p>
                  <p className="font-medium">{entity.entity_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{entity.status}</p>
                </div>
                {entity.tax_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tax ID</p>
                    <p className="font-medium">{entity.tax_id}</p>
                  </div>
                )}
                {entity.registration_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Registration Number</p>
                    <p className="font-medium">{entity.registration_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Contact details for this entity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {entity.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p>{entity.email}</p>
                  </div>
                )}
                {entity.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p>{entity.phone}</p>
                  </div>
                )}
                {entity.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={entity.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {entity.website}
                    </a>
                  </div>
                )}
                {entity.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="whitespace-pre-wrap">
                      {JSON.stringify(entity.registered_address, null, 2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for this entity</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/calculations?entity=${entity.id}`)}
              >
                View Calculations
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/calculations/new?entity=${entity.id}`)}
              >
                New Calculation
              </Button>
              <Button variant="outline" onClick={() => navigate(`/reports?entity=${entity.id}`)}>
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
