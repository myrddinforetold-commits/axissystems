import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, LogOut, ArrowLeft, Users } from 'lucide-react';

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

      setLoading(false);
    }

    fetchCompany();
  }, [id, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Companies
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold">{company.name}</span>
              {userRole && (
                <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  {userRole === 'owner' ? 'Owner' : 'Member'}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''} in this company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{member.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.user_id === user?.id ? 'You' : ''}
                    </p>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
