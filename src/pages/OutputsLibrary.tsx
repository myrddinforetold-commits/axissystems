import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Search, Eye, Pin, Download, Bot, CheckCircle2, XCircle, AlertTriangle, Building2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface TaskWithOutput {
  id: string;
  title: string;
  description: string;
  status: string;
  completion_summary: string | null;
  created_at: string;
  updated_at: string;
  role_id: string;
  role_name: string;
  latest_output: string | null;
}

interface Role {
  id: string;
  name: string;
}

export default function OutputsLibrary() {
  const { id: companyId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState<TaskWithOutput[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // Modal state
  const [selectedTask, setSelectedTask] = useState<TaskWithOutput | null>(null);
  const [pinning, setPinning] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);

      // Fetch company name
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle();
      
      setCompanyName(company?.name || "Company");

      // Fetch roles for filter
      const { data: rolesData } = await supabase
        .from("roles")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      
      setRoles(rolesData || []);

      // Fetch tasks with their latest outputs
      const { data: tasksData } = await supabase
        .from("tasks")
        .select(`
          id, title, description, status, completion_summary,
          created_at, updated_at, role_id,
          roles!inner(name)
        `)
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(100);

      // Fetch latest output for each task
      const tasksWithOutputs: TaskWithOutput[] = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: attempt } = await supabase
            .from("task_attempts")
            .select("model_output")
            .eq("task_id", task.id)
            .order("attempt_number", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            completion_summary: task.completion_summary,
            created_at: task.created_at,
            updated_at: task.updated_at,
            role_id: task.role_id,
            role_name: (task.roles as any)?.name || "Unknown",
            latest_output: attempt?.model_output || null,
          };
        })
      );

      setTasks(tasksWithOutputs);
      setLoading(false);
    }

    fetchData();
  }, [companyId]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      search === "" ||
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description.toLowerCase().includes(search.toLowerCase()) ||
      task.completion_summary?.toLowerCase().includes(search.toLowerCase()) ||
      task.latest_output?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesRole = roleFilter === "all" || task.role_id === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handlePinToMemory = async (task: TaskWithOutput) => {
    if (!user || !task.latest_output || !companyId) return;

    setPinning(true);
    const { error } = await supabase.from("company_memory").insert({
      company_id: companyId,
      source_role_id: task.role_id,
      pinned_by: user.id,
      content: task.latest_output,
      label: `Task: ${task.title}`,
    });

    if (error) {
      toast.error("Failed to pin to memory");
    } else {
      toast.success("Output pinned to company memory");
    }
    setPinning(false);
  };

  const handleExportMarkdown = (task: TaskWithOutput) => {
    if (!task.latest_output) return;

    const content = `# ${task.title}\n\n**Role:** ${task.role_name}\n**Status:** ${task.status}\n**Date:** ${format(new Date(task.updated_at), "PPP")}\n\n---\n\n${task.latest_output}`;
    
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as Markdown");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
      case "system_alert":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading outputs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/companies/${companyId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold">{companyName}</span>
              <span className="text-muted-foreground">/</span>
              <span>Outputs Library</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search outputs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="system_alert">System Alert</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No outputs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>{getStatusIcon(task.status)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.completion_summary && (
                          <div className="text-xs text-muted-foreground line-clamp-1 prose prose-xs dark:prose-invert max-w-none">
                            <ReactMarkdown>{task.completion_summary}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Bot className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{task.role_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {task.latest_output && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePinToMemory(task)}
                              disabled={pinning}
                            >
                              <Pin className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportMarkdown(task)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* Output Viewer Modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTask && getStatusIcon(selectedTask.status)}
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  {selectedTask.role_name}
                </Badge>
                <Badge variant="secondary">{selectedTask.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedTask.updated_at), "PPP 'at' p")}
                </span>
              </div>

              {selectedTask.completion_summary && (
                <div className="rounded-md bg-primary/10 p-3 text-sm prose prose-sm dark:prose-invert max-w-none">
                  <strong>Summary:</strong>
                  <ReactMarkdown>{selectedTask.completion_summary}</ReactMarkdown>
                </div>
              )}

              <ScrollArea className="h-[500px] rounded-md border p-4">
                {selectedTask.latest_output ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{selectedTask.latest_output}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    No output available for this task
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end gap-2">
                {selectedTask.latest_output && (
                  <>
                    <Button variant="outline" onClick={() => handlePinToMemory(selectedTask)}>
                      <Pin className="mr-2 h-4 w-4" />
                      Pin to Memory
                    </Button>
                    <Button variant="outline" onClick={() => handleExportMarkdown(selectedTask)}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
