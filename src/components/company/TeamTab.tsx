import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Clock, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import InviteUserDialog from './InviteUserDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Member {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface TeamTabProps {
  members: Member[];
  currentUserId: string | undefined;
  companyId: string;
  companyName: string;
  isOwner: boolean;
}

export default function TeamTab({ members, currentUserId, companyId, companyName, isOwner }: TeamTabProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!isOwner) {
      setLoadingInvitations(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('company_invitations')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [companyId, isOwner]);

  const handleRevokeInvitation = async (invitationId: string) => {
    setRevokingId(invitationId);
    try {
      const { error } = await supabase
        .from('company_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;
      toast.success('Invitation revoked');
      fetchInvitations();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast.error('Failed to revoke invitation');
    } finally {
      setRevokingId(null);
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? 's' : ''} in this company
              </CardDescription>
            </div>
            {isOwner && (
              <Button onClick={() => setInviteDialogOpen(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No team members yet. Invite someone to get started.
              </p>
              {isOwner && (
                <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Team Member
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{member.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.user_id === currentUserId ? 'You' : ''}
                    </p>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pending Invitations Section */}
          {isOwner && !loadingInvitations && pendingInvitations.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Pending Invitations
              </h4>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => {
                  const expired = isExpired(invitation.expires_at);
                  return (
                    <div
                      key={invitation.id}
                      className={`flex items-center justify-between p-3 rounded-md border ${
                        expired ? 'bg-muted/50 opacity-60' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{invitation.role}</span>
                            {expired ? (
                              <span className="text-destructive">Expired</span>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 cursor-help">
                                    <Clock className="h-3 w-3" />
                                    Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Invitation expires on {new Date(invitation.expires_at).toLocaleString()}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        disabled={revokingId === invitation.id}
                        className="h-8 w-8"
                      >
                        {revokingId === invitation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        companyId={companyId}
        companyName={companyName}
        onInviteSent={fetchInvitations}
      />
    </>
  );
}
