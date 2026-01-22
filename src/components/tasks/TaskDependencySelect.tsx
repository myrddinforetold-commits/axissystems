import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface TaskOption {
  id: string;
  title: string;
  status: string;
}

interface TaskDependencySelectProps {
  roleId: string;
  companyId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  excludeTaskId?: string;
}

export default function TaskDependencySelect({
  roleId,
  companyId,
  selectedIds,
  onSelectionChange,
  excludeTaskId,
}: TaskDependencySelectProps) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadTasks = async () => {
      if (!roleId || !companyId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title, status")
          .eq("role_id", roleId)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Filter out the current task if editing, and only show relevant tasks
        const filtered = (data || []).filter(t => 
          t.id !== excludeTaskId
        );
        
        setTasks(filtered);
      } catch (err) {
        console.error("Failed to load tasks for dependencies:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [roleId, companyId, excludeTaskId]);

  const toggleTask = (taskId: string) => {
    if (selectedIds.includes(taskId)) {
      onSelectionChange(selectedIds.filter(id => id !== taskId));
    } else {
      onSelectionChange([...selectedIds, taskId]);
    }
  };

  const selectedTasks = tasks.filter(t => selectedIds.includes(t.id));

  if (tasks.length === 0 && !isLoading) {
    return null; // Don't show if no tasks available
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading}
          >
            <span className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {selectedIds.length === 0
                ? "Select dependencies (optional)"
                : `${selectedIds.length} task${selectedIds.length > 1 ? "s" : ""} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tasks..." />
            <CommandList>
              <CommandEmpty>No tasks found.</CommandEmpty>
              <CommandGroup>
                {tasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.title}
                    onSelect={() => toggleTask(task.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(task.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{task.title}</span>
                    </div>
                    <Badge 
                      variant={task.status === "completed" ? "default" : "secondary"}
                      className="ml-2 shrink-0 text-xs"
                    >
                      {task.status}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTasks.map((task) => (
            <Badge
              key={task.id}
              variant="outline"
              className="text-xs cursor-pointer hover:bg-destructive/10"
              onClick={() => toggleTask(task.id)}
            >
              {task.title.substring(0, 30)}{task.title.length > 30 ? "..." : ""}
              <span className="ml-1 opacity-60">×</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
