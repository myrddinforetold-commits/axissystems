import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, FileText, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalCompanies: number;
  totalUsers: number;
  pendingRequests: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalUsers: 0,
    pendingRequests: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [companiesRes, profilesRes, requestsRes] = await Promise.all([
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);

        // Get recent access requests as activity
        const { data: recentRequests } = await supabase
          .from('access_requests')
          .select('id, name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          totalCompanies: companiesRes.count || 0,
          totalUsers: profilesRes.count || 0,
          pendingRequests: requestsRes.count || 0,
          recentActivity: (recentRequests || []).map(r => ({
            id: r.id,
            type: 'access_request',
            description: `${r.name} (${r.email}) requested access`,
            created_at: r.created_at,
          })),
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Companies',
      value: stats.totalCompanies,
      icon: Building2,
      href: '/admin/companies',
      color: 'text-blue-500',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      href: '/admin/users',
      color: 'text-green-500',
    },
    {
      title: 'Pending Requests',
      value: stats.pendingRequests,
      icon: FileText,
      href: '/admin/access-requests',
      color: 'text-orange-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Frontier Intelligence platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest access requests and system events</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <p className="text-sm">{activity.description}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
