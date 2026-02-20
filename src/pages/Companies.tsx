import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building2, LogOut } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

interface Company {
  id: string;
  name: string;
  created_at: string;
  role: string;
}

export default function Companies() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanies() {
      if (!user) return;

      const { data, error } = await supabase
        .from('company_members')
        .select(`
          role,
          companies (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching companies:', error);
        setLoading(false);
        return;
      }

      const companiesData = data?.map((item) => ({
        id: item.companies?.id ?? '',
        name: item.companies?.name ?? '',
        created_at: item.companies?.created_at ?? '',
        role: item.role,
      })).filter(c => c.id) ?? [];

      // If user has exactly one company, redirect directly to it
      if (companiesData.length === 1) {
        navigate(`/companies/${companiesData[0].id}`, { replace: true });
        return;
      }

      setCompanies(companiesData);
      setLoading(false);
    }

    fetchCompanies();
  }, [user, navigate]);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:py-4">
          <BrandLogo className="text-lg text-foreground shrink-0" />
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="shrink-0">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Your Companies</h2>
            <p className="text-sm text-muted-foreground">Select a company or create a new one</p>
          </div>
          <Button onClick={() => navigate('/companies/new')} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Company
          </Button>
        </div>

        {companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No companies yet</h3>
              <p className="mb-4 text-center text-muted-foreground">
                Create your first company to get started
              </p>
              <Button onClick={() => navigate('/companies/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Company
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {companies.map((company) => (
              <Card
                key={company.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => navigate(`/companies/${company.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {company.name}
                  </CardTitle>
                  <CardDescription>
                    {company.role === 'owner' ? 'Owner' : 'Member'} · Created{' '}
                    {new Date(company.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
