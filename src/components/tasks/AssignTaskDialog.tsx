import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import TaskDependencySelect from "./TaskDependencySelect";
import type { TaskInput } from "@/hooks/useTaskExecution";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().min(1, "Description is required"),
  completion_criteria: z.string().min(1, "Completion criteria is required"),
  max_attempts: z.number().min(1).max(10),
  depends_on: z.array(z.string()).default([]),
});

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (input: TaskInput) => Promise<void>;
  roleName: string;
  roleId: string;
  companyId: string;
}

export default function AssignTaskDialog({
  open,
  onOpenChange,
  onAssign,
  roleName,
  roleId,
  companyId,
}: AssignTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      completion_criteria: "",
      max_attempts: 5,
      depends_on: [],
    },
  });
  const maxAttempts = form.watch("max_attempts");
  const dependsOn = form.watch("depends_on");

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await onAssign({
        title: values.title,
        description: values.description,
        completion_criteria: values.completion_criteria,
        max_attempts: values.max_attempts,
        depends_on: values.depends_on,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Task to {roleName}</DialogTitle>
          <DialogDescription>
            Define a task with clear completion criteria. The AI will attempt to complete it.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            This task will automatically retry up to <strong>{maxAttempts} times</strong> if 
            it fails to meet the criteria. You can stop it manually at any time.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Draft Q4 strategy summary" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you want the AI to accomplish..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="completion_criteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion Criteria</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="How will we know the task is complete? Be specific..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Define clear, measurable criteria for success. The AI will be evaluated against these.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depends_on"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dependencies</FormLabel>
                  <FormControl>
                    <TaskDependencySelect
                      roleId={roleId}
                      companyId={companyId}
                      selectedIds={field.value}
                      onSelectionChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Select tasks that must complete before this one starts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_attempts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Attempts: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      className="py-4"
                    />
                  </FormControl>
                  <FormDescription>
                    How many times should the AI retry if it fails?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Task"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
