import { Button } from "@/components/ui/button";
import { StopCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface StopTaskButtonProps {
  onStop: () => Promise<void>;
  isExecuting: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export default function StopTaskButton({ 
  onStop, 
  isExecuting,
  variant = "outline",
  size = "default"
}: StopTaskButtonProps) {
  const [isStopping, setIsStopping] = useState(false);

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await onStop();
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className="text-destructive hover:text-destructive"
          disabled={isStopping}
        >
          {isStopping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <StopCircle className="h-4 w-4" />
          )}
          {size !== "icon" && <span className="ml-2">Stop Task</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stop this task?</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately stop the task execution. The task cannot be resumed 
            once stopped, but you can assign a new task.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleStop}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Stop Task
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
