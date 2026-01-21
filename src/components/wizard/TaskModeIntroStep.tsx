import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListTodo, RotateCcw, Target, Hand, SkipForward } from "lucide-react";

interface TaskModeIntroStepProps {
  roleName: string;
  onEnable: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const features = [
  {
    icon: RotateCcw,
    title: "Automatic retry",
    description: "Tasks are retried until completion criteria are met.",
  },
  {
    icon: Target,
    title: "Clear criteria",
    description: "You define explicit success conditions for each task.",
  },
  {
    icon: Hand,
    title: "Human controlled",
    description: "You can stop any task at any time. Maximum attempts are bounded.",
  },
];

export default function TaskModeIntroStep({
  roleName,
  onEnable,
  onSkip,
  isLoading,
}: TaskModeIntroStepProps) {
  return (
    <Card className="max-w-lg mx-auto border-border/50">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <ListTodo className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl">Enable Task Mode?</CardTitle>
        <CardDescription className="text-base">
          Task Mode allows {roleName} to work on structured tasks with retry capability.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Nothing executes without your intent.</span>
            {" "}Tasks require explicit confirmation before starting.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onEnable}
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? "Enabling..." : "Enable Task Mode"}
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip for now
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You can enable or disable Task Mode later from the Tasks panel.
        </p>
      </CardContent>
    </Card>
  );
}
