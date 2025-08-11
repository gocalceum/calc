import { Check, ChevronsUpDown, Plus, Building2, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEntity } from '@/contexts/EntityContext'
import { useNavigate } from 'react-router-dom'

export function EntitySwitcher() {
  const navigate = useNavigate()
  const { currentEntity, entities, switchEntity, isLoading } = useEntity()

  const handleSwitch = async (entityId: string) => {
    if (entityId !== currentEntity?.id) {
      await switchEntity(entityId)
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" role="combobox" className="w-full justify-between" disabled>
        <Briefcase className="mr-2 h-4 w-4" />
        Loading entities...
        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
      </Button>
    )
  }

  if (!entities || entities.length === 0) {
    return (
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => navigate('/entities/new')}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add First Entity
        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <div className="flex items-center">
            <Briefcase className="mr-2 h-4 w-4" />
            <span className="truncate">{currentEntity ? currentEntity.name : 'Select Entity'}</span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search entities..." />
          <CommandList>
            <CommandEmpty>No entities found.</CommandEmpty>
            <CommandGroup heading="Client Entities">
              {entities.map((entity) => (
                <CommandItem
                  key={entity.id}
                  value={entity.name}
                  onSelect={() => handleSwitch(entity.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      currentEntity?.id === entity.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{entity.name}</span>
                    <span className="text-xs text-muted-foreground">{entity.entity_type}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={() => navigate('/entities/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Entity
              </CommandItem>
              <CommandItem onSelect={() => navigate('/entities')}>
                <Building2 className="mr-2 h-4 w-4" />
                Manage Entities
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
