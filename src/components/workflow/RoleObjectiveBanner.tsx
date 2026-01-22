import { Target } from "lucide-react";

interface RoleObjective {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface RoleObjectiveBannerProps {
  objective: RoleObjective;
}

export default function RoleObjectiveBanner({ objective }: RoleObjectiveBannerProps) {
  return (
    <div className="border-b border-border bg-primary/5 px-4 py-2">
      <div className="flex items-start gap-2">
        <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Current Objective: {objective.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {objective.description}
          </p>
        </div>
      </div>
    </div>
  );
}
