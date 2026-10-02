import type { ConvocationType } from '@domain/entities/convocation'
import { Tabs, TabsList, TabsTrigger } from '@presentation/shared/components/ui/tabs'
import { MISSION_TYPE_TABS } from '../mission-template-view'

interface MissionTemplateTypeTabsProps {
  activeType: ConvocationType
  onSelect: (type: ConvocationType) => void
}

// specs/web-mission-templates.md UI design "Barre d'onglets" — triggers only;
// the filtered table is rendered by the page below, outside TabsContent.
export function MissionTemplateTypeTabs({ activeType, onSelect }: MissionTemplateTypeTabsProps) {
  return (
    <Tabs value={activeType} onValueChange={(value) => onSelect(value as ConvocationType)}>
      <TabsList className="h-auto gap-1 rounded-2xl border border-border bg-card p-1">
        {MISSION_TYPE_TABS.map((tab) => (
          <TabsTrigger
            key={tab.type}
            value={tab.type}
            className="h-11 min-w-0 flex-none rounded-xl px-6 font-bold text-muted-foreground data-[state=active]:bg-coach-green data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
