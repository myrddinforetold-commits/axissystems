import { FileText, AlertTriangle, CheckSquare } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type ReportType = 'weekly_summary' | 'blockers' | 'action_items';

interface ReportTypeSelectorProps {
  value: ReportType;
  onChange: (value: ReportType) => void;
  disabled?: boolean;
}

const reportTypes = [
  {
    value: 'weekly_summary' as const,
    label: 'Weekly Summary',
    icon: FileText,
    description: 'Comprehensive overview of all activities',
  },
  {
    value: 'blockers' as const,
    label: 'Blockers',
    icon: AlertTriangle,
    description: 'Issues preventing progress',
  },
  {
    value: 'action_items' as const,
    label: 'Action Items',
    icon: CheckSquare,
    description: 'Tasks requiring attention',
  },
];

export default function ReportTypeSelector({ value, onChange, disabled }: ReportTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Report Type</label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as ReportType)}
        disabled={disabled}
        className="justify-start gap-2"
      >
        {reportTypes.map((type) => (
          <ToggleGroupItem
            key={type.value}
            value={type.value}
            aria-label={type.label}
            className="flex items-center gap-2 px-4 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <type.icon className="h-4 w-4" />
            <span>{type.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">
        {reportTypes.find((t) => t.value === value)?.description}
      </p>
    </div>
  );
}
