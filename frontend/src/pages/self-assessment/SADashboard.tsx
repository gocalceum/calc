import { useState, useEffect } from 'react'
import { useEntity } from '@/contexts/EntityContext'
import { useSAAuth } from '@/hooks/useSAAuth'
import { useSABusinesses } from '@/hooks/useSABusinesses'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileCheck,
  Building2,
  Users,
  User,
  Briefcase,
} from 'lucide-react'

const businessTypeIcons = {
  sole_trader: User,
  freelancer: User,
  landlord: Building2,
  partnership: Users,
  limited_company: Building2,
  trust: Briefcase,
  other: FileCheck,
}

const businessTypeLabels = {
  sole_trader: 'Sole Trader',
  freelancer: 'Freelancer',
  landlord: 'Landlord',
  partnership: 'Partnership',
  limited_company: 'Limited Company',
  trust: 'Trust',
  other: 'Other',
}

const syncStatusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'secondary' as const },
  syncing: { label: 'Syncing', icon: RefreshCw, color: 'default' as const },
  completed: { label: 'Synced', icon: CheckCircle, color: 'secondary' as const },
  failed: { label: 'Failed', icon: XCircle, color: 'destructive' as const },
  disconnected: { label: 'Disconnected', icon: XCircle, color: 'outline' as const },
}

export default function SADashboard() {
  const { entities } = useEntity()
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')
  const { initiateOAuth, error: authError } = useSAAuth()
  const {
    connections,
    isLoading,
    error: fetchError,
    syncBusiness,
    refetch,
  } = useSABusinesses(selectedEntityId)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedEntityId && entities.length > 0) {
      setSelectedEntityId(entities[0].id)
    }
  }, [entities, selectedEntityId])

  // Listen for OAuth success messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        setSuccessMessage(
          `Successfully connected ${event.data.connections?.length || 0} business(es)`
        )
        refetch() // Refresh the connections list
        setTimeout(() => setSuccessMessage(null), 5000) // Clear message after 5 seconds
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [refetch])

  const handleConnect = async () => {
    if (!selectedEntityId) {
      alert('Please select an entity first')
      return
    }

    const result = await initiateOAuth(selectedEntityId)
    if (result) {
      // OAuth window opened, user will complete flow
      console.log('OAuth initiated, state:', result.state)
    }
  }

  const handleSync = async (connectionId: string) => {
    setIsSyncing(connectionId)
    const success = await syncBusiness(connectionId)
    if (success) {
      console.log('Business synced successfully')
    }
    setIsSyncing(null)
  }

  const activeConnections = connections.filter((c) => c.is_active)
  const disconnectedConnections = connections.filter((c) => !c.is_active)

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
              <BreadcrumbItem>
                <BreadcrumbPage>Self Assessment</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Self Assessment Connections</h1>
              <p className="text-muted-foreground">Manage your Making Tax Digital connections</p>
            </div>
          </div>

          {/* Entity Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Entity</CardTitle>
              <CardDescription>
                Choose which entity to manage Self Assessment connections for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name} ({entity.entity_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleConnect} disabled={!selectedEntityId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Self Assessment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Success Message */}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Error Messages */}
          {(authError || fetchError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{authError || fetchError}</AlertDescription>
            </Alert>
          )}

          {/* Active Connections */}
          {activeConnections.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Active Connections</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeConnections.map((connection) => {
                  const Icon = businessTypeIcons[connection.business_type] || FileCheck
                  const status = syncStatusConfig[connection.sync_status]
                  const StatusIcon = status.icon

                  return (
                    <Card key={connection.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {connection.business_name || connection.hmrc_business_id}
                            </CardTitle>
                          </div>
                          <Badge variant={status.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <CardDescription>
                          {businessTypeLabels[connection.business_type] || connection.business_type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Business ID:</span>{' '}
                          <span className="font-mono">{connection.hmrc_business_id}</span>
                        </div>
                        {connection.utr && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">UTR:</span>{' '}
                            <span className="font-mono">••••••{connection.utr.slice(-4)}</span>
                          </div>
                        )}
                        {connection.vat_registration_number && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">VAT:</span>{' '}
                            <span className="font-mono">{connection.vat_registration_number}</span>
                          </div>
                        )}
                        {connection.last_sync_at && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Last sync:</span>{' '}
                            {new Date(connection.last_sync_at).toLocaleString()}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleSync(connection.id)}
                          disabled={isSyncing === connection.id}
                        >
                          {isSyncing === connection.id ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Sync Now
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Connections */}
          {!isLoading && selectedEntityId && activeConnections.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Self Assessment Connections</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  Connect your Self Assessment account to automatically sync tax information and
                  obligations
                </p>
                <Button onClick={handleConnect}>
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Self Assessment Account
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Disconnected Connections */}
          {disconnectedConnections.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Disconnected Connections
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {disconnectedConnections.map((connection) => (
                  <Card key={connection.id} className="opacity-60">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {connection.business_name || connection.hmrc_business_id}
                      </CardTitle>
                      <CardDescription>
                        Disconnected{' '}
                        {connection.disconnected_at &&
                          new Date(connection.disconnected_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
