import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useChatStream } from "@/hooks/useChatStream";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { messages, isLoading, isStreaming, loadMessages, sendMessage } = useChatStream({
    roleId: roleId || "",
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
      if (!roleId || !companyId) {
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
        await loadMessages();
      } catch (err) {
        console.error("Failed to load role:", err);
        setError("Failed to load role. You may not have access.");
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [roleId, companyId, loadMessages]);

  const handleBack = () => {
    navigate(`/companies/${companyId}`);
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
      />
      <ChatMessages messages={messages} isLoading={isLoading} />
      <ChatInput
        onSend={sendMessage}
        isStreaming={isStreaming}
      />
    </div>
  );
}
