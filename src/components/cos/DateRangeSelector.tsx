import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export type DateRangePreset = '7days' | '14days' | '30days';

interface DateRangeSelectorProps {
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
  disabled?: boolean;
}

const presets = [
  { value: '7days' as const, label: 'Last 7 days' },
  { value: '14days' as const, label: 'Last 14 days' },
  { value: '30days' as const, label: 'Last 30 days' },
];

export function getDateRange(preset: DateRangePreset): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  
  switch (preset) {
    case '7days':
      start.setDate(end.getDate() - 7);
      break;
    case '14days':
      start.setDate(end.getDate() - 14);
      break;
    case '30days':
      start.setDate(end.getDate() - 30);
      break;
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export default function DateRangeSelector({ value, onChange, disabled }: DateRangeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Date Range</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-48">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
