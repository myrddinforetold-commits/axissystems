import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Users, ArrowRight } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  display_name: string | null;
}

interface DelegateToRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelegate: (targetRoleId: string, instructions: string) => Promise<void>;
  companyId: string;
  sourceRoleId: string;
  sourceOutput: string;
  isProcessing?: boolean;
}

export default function DelegateToRoleDialog({
  open,
  onOpenChange,
  onDelegate,
  companyId,
  sourceRoleId,
  sourceOutput,
  isProcessing = false,
}: DelegateToRoleDialogProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      loadRoles();
    }
  }, [open, companyId]);

  const loadRoles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('roles')
      .select('id, name, display_name')
      .eq('company_id', companyId)
      .neq('id', sourceRoleId)
      .eq('is_activated', true)
      .order('name');
    
    setRoles(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedRoleId) return;
    await onDelegate(selectedRoleId, instructions);
    setSelectedRoleId('');
    setInstructions('');
    onOpenChange(false);
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Delegate to Role
          </DialogTitle>
          <DialogDescription>
            Create a follow-up task for another role based on this output.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="target-role">Target Role</Label>
            <Select 
              value={selectedRoleId} 
              onValueChange={setSelectedRoleId}
              disabled={loading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={loading ? "Loading roles..." : "Select a role"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.display_name || role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roles.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground mt-1">
                No other activated roles available to delegate to.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="instructions">Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add specific instructions for how to execute this work..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-2">Output to delegate:</p>
            <p className="line-clamp-3">{sourceOutput}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRoleId || isProcessing}
          >
            <ArrowRight className="mr-1 h-4 w-4" />
            Delegate to {selectedRole?.display_name || selectedRole?.name || 'Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
