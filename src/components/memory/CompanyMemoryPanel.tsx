import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MemoryCard from "./MemoryCard";

interface CompanyMemory {
  id: string;
  content: string;
  label: string | null;
  source_role_id: string | null;
  pinned_by: string;
  created_at: string;
  source_role_name?: string;
  pinned_by_name?: string;
}

interface CompanyMemoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  isOwner: boolean;
}

export default function CompanyMemoryPanel({
  open,
  onOpenChange,
  companyId,
  isOwner,
}: CompanyMemoryPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memories, setMemories] = useState<CompanyMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && companyId) {
      fetchMemories();
    }
  }, [open, companyId]);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      // Fetch memories
      const { data: memoriesData, error: memoriesError } = await supabase
        .from("company_memory")
        .select("id, content, label, source_role_id, pinned_by, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (memoriesError) throw memoriesError;

      // Fetch role names for source_role_id
      const roleIds = [...new Set(memoriesData?.filter(m => m.source_role_id).map(m => m.source_role_id) || [])];
      const userIds = [...new Set(memoriesData?.map(m => m.pinned_by) || [])];

      let rolesMap = new Map<string, string>();
      let profilesMap = new Map<string, string>();

      if (roleIds.length > 0) {
        const { data: rolesData } = await supabase
          .from("roles")
          .select("id, name")
          .in("id", roleIds);
        rolesMap = new Map(rolesData?.map(r => [r.id, r.name]) || []);
      }

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        profilesMap = new Map(profilesData?.map(p => [p.id, p.display_name]) || []);
      }

      const enrichedMemories = memoriesData?.map(m => ({
        ...m,
        source_role_name: m.source_role_id ? rolesMap.get(m.source_role_id) : undefined,
        pinned_by_name: profilesMap.get(m.pinned_by),
      })) || [];

      setMemories(enrichedMemories);
    } catch (err) {
      console.error("Failed to fetch memories:", err);
      toast({
        title: "Error",
        description: "Failed to load company memories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("company_memory")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMemories(prev => prev.filter(m => m.id !== id));
      toast({
        title: "Memory deleted",
        description: "The memory has been removed.",
      });
    } catch (err) {
      console.error("Failed to delete memory:", err);
      toast({
        title: "Error",
        description: "Failed to delete memory",
        variant: "destructive",
      });
    }
  };

  const filteredMemories = memories.filter(m => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.content.toLowerCase().includes(query) ||
      m.label?.toLowerCase().includes(query) ||
      m.source_role_name?.toLowerCase().includes(query)
    );
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Company Memory
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-180px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BrainCircuit className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-foreground mb-1">
                  {searchQuery ? "No matching memories" : "No memories yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {searchQuery
                    ? "Try a different search term"
                    : "Pin messages from role conversations to build shared company knowledge."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {filteredMemories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    id={memory.id}
                    content={memory.content}
                    label={memory.label}
                    sourceRoleName={memory.source_role_name}
                    pinnedByName={memory.pinned_by_name}
                    createdAt={memory.created_at}
                    canDelete={isOwner}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
