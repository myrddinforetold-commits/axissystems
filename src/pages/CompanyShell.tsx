import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, LogOut, ArrowLeft, Users, Bot, Activity, LayoutDashboard, Library, Settings, BarChart3 } from 'lucide-react';
import TeamTab from '@/components/company/TeamTab';
import RolesTab from '@/components/roles/RolesTab';
import WorkflowTab from '@/components/workflow/WorkflowTab';
import CompanyDashboard from '@/components/dashboard/CompanyDashboard';
import WebhookSettingsTab from '@/components/settings/WebhookSettingsTab';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { RoleAnalyticsDashboard } from '@/components/analytics/RoleAnalyticsDashboard';

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
}

export default function CompanyShell() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingWorkflowCount, setPendingWorkflowCount] = useState(0);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  useEffect(() => {
    async function fetchCompany() {
      if (!id || !user) return;

      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company:', companyError);
        setError('Failed to load company');
        setLoading(false);
        return;
      }

      if (!companyData) {
        setError('Company not found or you do not have access');
        setLoading(false);
        return;
      }

      setCompany(companyData);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('company_members')
        .select('id, user_id, role')
        .eq('company_id', id);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        setLoading(false);
        return;
      }

      // Fetch profiles for all members
      const userIds = membersData?.map(m => m.user_id) ?? [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.display_name]) ?? []);

      const formattedMembers = membersData?.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        display_name: profilesMap.get(m.user_id) ?? 'Unknown',
      })) ?? [];
      setMembers(formattedMembers);

      // Find current user's role
      const currentUserMember = formattedMembers.find((m) => m.user_id === user.id);
      setUserRole(currentUserMember?.role ?? null);

      // Fetch pending workflow requests count
      const { count } = await supabase
        .from('workflow_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id)
        .eq('status', 'pending');
      
      setPendingWorkflowCount(count || 0);

      setLoading(false);
    }

    fetchCompany();
  }, [id, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isOwner = userRole === 'owner';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-center text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate('/companies')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Companies
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/companies')} className="shrink-0 hidden sm:flex">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Companies
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/companies')} className="shrink-0 sm:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-5 w-5 shrink-0" />
              <span className="font-semibold truncate">{company.name}</span>
              {userRole && (
                <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground shrink-0 hidden sm:inline">
                  {userRole === 'owner' ? 'Owner' : 'Member'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <NotificationBell onClick={() => setNotificationPanelOpen(true)} />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden sm:flex">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="sm:hidden">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      <NotificationPanel 
        open={notificationPanelOpen} 
        onOpenChange={setNotificationPanelOpen} 
      />

      <main className="mx-auto max-w-5xl px-4 py-4 sm:py-8">
        <Tabs defaultValue="dashboard" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto">
                <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Home</span>
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
                <TabsTrigger value="roles" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
                  <Bot className="h-4 w-4" />
                  Roles
                </TabsTrigger>
                {isOwner && (
                  <TabsTrigger value="workflow" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
                    <Activity className="h-4 w-4" />
                    <span className="hidden sm:inline">Workflow</span>
                    <span className="sm:hidden">Flow</span>
                    {pendingWorkflowCount > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {pendingWorkflowCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
                {isOwner && (
                  <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Analytics</span>
                  </TabsTrigger>
                )}
                {isOwner && (
                  <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/companies/${company.id}/outputs`)}
              className="shrink-0 self-start sm:self-auto"
            >
              <Library className="mr-2 h-4 w-4" />
              Outputs Library
            </Button>
          </div>

          <TabsContent value="dashboard">
            <CompanyDashboard companyId={company.id} />
          </TabsContent>

          <TabsContent value="team">
            <TeamTab 
              members={members} 
              currentUserId={user?.id} 
              companyId={company.id}
              companyName={company.name}
              isOwner={isOwner}
            />
          </TabsContent>

          <TabsContent value="roles">
            <RolesTab companyId={company.id} isOwner={isOwner} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="workflow">
              <WorkflowTab companyId={company.id} />
            </TabsContent>
          )}

          {isOwner && (
            <TabsContent value="analytics">
              <RoleAnalyticsDashboard companyId={company.id} />
            </TabsContent>
          )}

          {isOwner && (
            <TabsContent value="settings">
              <WebhookSettingsTab companyId={company.id} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
