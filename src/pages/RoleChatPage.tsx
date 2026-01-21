import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useChatStream } from "@/hooks/useChatStream";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import CompanyMemoryPanel from "@/components/memory/CompanyMemoryPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

interface Role {
  id: string;
  name: string;
  mandate: string;
  company_id: string;
}

export default function RoleChatPage() {
  const { id: companyId, roleId } = useParams<{ id: string; roleId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);

  const { 
    messages, 
    isLoading, 
    isStreaming, 
    pinnedMessageIds,
    loadMessages, 
    sendMessage,
    pinToCompanyMemory,
  } = useChatStream({
    roleId: roleId || "",
    companyId: companyId,
    onError: (err) => {
      toast({
        title: "Chat Error",
        description: err,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    async function fetchRole() {
      if (!roleId || !companyId || !user) {
        setError("Invalid role or company");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("roles")
          .select("id, name, mandate, company_id")
          .eq("id", roleId)
          .eq("company_id", companyId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Role not found");

        setRole(data);

        // Check if user is owner
        const { data: memberData } = await supabase
          .from("company_members")
          .select("role")
          .eq("company_id", companyId)
          .eq("user_id", user.id)
          .single();

        setIsOwner(memberData?.role === "owner");

        await loadMessages();
      } catch (err) {
        console.error("Failed to load role:", err);
        setError("Failed to load role. You may not have access.");
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [roleId, companyId, user, loadMessages]);

  const handleBack = () => {
    navigate(`/companies/${companyId}`);
  };

  const handlePinToMemory = async (messageId: string, content: string, label: string) => {
    await pinToCompanyMemory(messageId, content, label);
    toast({
      title: "Memory pinned",
      description: "Message saved to company memory.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || "Role not found"}</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Company
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <ChatHeader
        roleName={role.name}
        mandate={role.mandate}
        onBack={handleBack}
        onOpenMemory={() => setShowMemoryPanel(true)}
      />
      <ChatMessages 
        messages={messages} 
        isLoading={isLoading}
        pinnedMessageIds={pinnedMessageIds}
        onPinToMemory={handlePinToMemory}
      />
      <ChatInput
        onSend={sendMessage}
        isStreaming={isStreaming}
      />
      
      {companyId && (
        <CompanyMemoryPanel
          open={showMemoryPanel}
          onOpenChange={setShowMemoryPanel}
          companyId={companyId}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
