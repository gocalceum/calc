import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, Users, Briefcase, User, FileText, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEntity } from '@/contexts/EntityContext'
import { useOrganization } from '@/contexts/OrganizationContext'

const entityTypeIcons = {
  sole_trader: User,
  freelancer: User,
  partnership: Users,
  limited_company: Building2,
  llp: Building2,
  charity: Briefcase,
  other: FileText,
}

const entityTypeLabels = {
  sole_trader: 'Sole Trader',
  freelancer: 'Freelancer',
  partnership: 'Partnership',
  limited_company: 'Limited Company',
  llp: 'LLP',
  charity: 'Charity',
  other: 'Other',
}

const statusColors = {
  active: 'default',
  dormant: 'secondary',
  ceased: 'destructive',
  archived: 'outline',
} as const

export default function Entities() {
  const navigate = useNavigate()
  const { entities, switchEntity, isLoading } = useEntity()
  const { currentOrganization } = useOrganization()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEntities = entities.filter((entity) =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEntityClick = async (entityId: string) => {
    await switchEntity(entityId)
    navigate(`/entities/${entityId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading entities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entities</h1>
          <p className="text-muted-foreground mt-1">
            Manage client businesses for {currentOrganization?.name}
          </p>
        </div>
        <Button onClick={() => navigate('/entities/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entity
        </Button>
      </div>

      {entities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No entities yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by adding your first client entity
            </p>
            <Button onClick={() => navigate('/entities/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Entity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search entities..."
              className="w-full max-w-sm px-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntities.map((entity) => {
              const Icon =
                entityTypeIcons[entity.entity_type as keyof typeof entityTypeIcons] || FileText
              const typeLabel =
                entityTypeLabels[entity.entity_type as keyof typeof entityTypeLabels] ||
                entity.entity_type

              return (
                <Card
                  key={entity.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleEntityClick(entity.id)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold">{entity.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">{typeLabel}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/entities/${entity.id}`)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/entities/${entity.id}/edit`)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/entities/${entity.id}/calculations`)}
                        >
                          Calculations
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          statusColors[entity.status as keyof typeof statusColors] || 'default'
                        }
                      >
                        {entity.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {entity.vat_number && <span>VAT: {entity.vat_number}</span>}
                      </div>
                    </div>
                    {entity.year_end && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Year End: {new Date(entity.year_end).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
