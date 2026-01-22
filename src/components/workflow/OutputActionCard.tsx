import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutputActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success';
}

export default function OutputActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false,
  variant = 'default',
}: OutputActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
        "hover:bg-accent hover:border-accent-foreground/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === 'primary' && "border-primary/50 bg-primary/5 hover:bg-primary/10",
        variant === 'success' && "border-green-500/50 bg-green-500/5 hover:bg-green-500/10"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn(
          "h-4 w-4",
          variant === 'primary' && "text-primary",
          variant === 'success' && "text-green-500"
        )} />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
