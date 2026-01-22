import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Target, CheckCircle2, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Objective {
  id: string;
  role_id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  created_at: string;
}

interface ObjectivePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string;
  roleName: string;
  companyId: string;
  isOwner: boolean;
}

export default function ObjectivePanel({
  open,
  onOpenChange,
  roleId,
  roleName,
  companyId,
  isOwner,
}: ObjectivePanelProps) {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open && roleId) {
      loadObjectives();
    }
  }, [open, roleId]);

  const loadObjectives = async () => {
    setIsLoading(true);
    try {
      // Use any cast since types may not be generated yet for new table
      const { data, error } = await (supabase as any)
        .from("role_objectives")
        .select("*")
        .eq("role_id", roleId)
        .order("priority", { ascending: true });

      if (error) throw error;
      setObjectives((data || []) as Objective[]);
    } catch (error) {
      console.error("Failed to load objectives:", error);
      toast.error("Failed to load objectives");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDescription.trim() || !user) return;
    
    setIsCreating(true);
    try {
      const { error } = await (supabase as any).from("role_objectives").insert({
        role_id: roleId,
        company_id: companyId,
        title: newTitle.trim(),
        description: newDescription.trim(),
        created_by: user.id,
        priority: objectives.length + 1,
      });

      if (error) throw error;

      toast.success("Objective created");
      setNewTitle("");
      setNewDescription("");
      setShowCreateDialog(false);
      loadObjectives();
    } catch (error) {
      console.error("Failed to create objective:", error);
      toast.error("Failed to create objective");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from("role_objectives")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`Objective ${newStatus}`);
      loadObjectives();
    } catch (error) {
      console.error("Failed to update objective:", error);
      toast.error("Failed to update objective");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("role_objectives")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Objective deleted");
      loadObjectives();
    } catch (error) {
      console.error("Failed to delete objective:", error);
      toast.error("Failed to delete objective");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {roleName} Objectives
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {isOwner && (
              <Button 
                onClick={() => setShowCreateDialog(true)} 
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Objective
              </Button>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : objectives.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No objectives assigned yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add objectives to direct this role's autonomous behavior.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {objectives.map((objective) => (
                  <Card key={objective.id} className="border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(objective.status)}
                            <span className="text-xs text-muted-foreground">
                              #{objective.priority}
                            </span>
                          </div>
                          <p className="font-medium text-sm">{objective.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {objective.description}
                          </p>
                        </div>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                          {objective.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(objective.id, "paused")}
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                Pause
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(objective.id, "completed")}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            </>
                          )}
                          {objective.status === "paused" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(objective.id, "active")}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Resume
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive ml-auto"
                            onClick={() => handleDelete(objective.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Objective Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Objective for {roleName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Objective Title</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Increase user activation rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What should this role work toward? Be specific about success criteria."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!newTitle.trim() || !newDescription.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Objective"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
