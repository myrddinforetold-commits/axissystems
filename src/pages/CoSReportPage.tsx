import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import ReportTypeSelector, { type ReportType } from '@/components/cos/ReportTypeSelector';
import DateRangeSelector, { type DateRangePreset, getDateRange } from '@/components/cos/DateRangeSelector';
import ReportViewer from '@/components/cos/ReportViewer';
import ReportActions from '@/components/cos/ReportActions';
import PreviousReports from '@/components/cos/PreviousReports';

interface Role {
  id: string;
  name: string;
  mandate: string;
  company_id: string;
  authority_level: string;
}

interface Report {
  id?: string;
  content: string;
  report_type: ReportType;
  created_at: string;
}

export default function CoSReportPage() {
  const { id: companyId, roleId } = useParams<{ id: string; roleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('weekly_summary');
  const [dateRange, setDateRange] = useState<DateRangePreset>('7days');
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchRole();
    checkOwnership();
  }, [roleId, companyId, user]);

  const fetchRole = async () => {
    if (!roleId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, mandate, company_id, authority_level')
        .eq('id', roleId)
        .single();

      if (error) throw error;
      setRole(data);

      if (data.authority_level !== 'orchestrator') {
        toast.error('This role is not a Chief of Staff');
        navigate(`/companies/${companyId}`);
      }
    } catch (error) {
      console.error('Failed to fetch role:', error);
      toast.error('Failed to load role');
    } finally {
      setLoading(false);
    }
  };

  const checkOwnership = async () => {
    if (!companyId || !user) return;
    try {
      const { data } = await supabase
        .from('company_members')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .single();

      setIsOwner(data?.role === 'owner');
    } catch (error) {
      console.error('Failed to check ownership:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!roleId || !user) return;
    setGenerating(true);
    setCurrentReport(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to generate reports');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cos-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            role_id: roleId,
            report_type: reportType,
            date_range: getDateRange(dateRange),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const data = await response.json();
      setCurrentReport(data.report);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Role not found</p>
            <Button className="w-full mt-4" onClick={() => navigate(`/companies/${companyId}`)}>
              Back to Company
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/companies/${companyId}`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
              <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">{role.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        <Shield className="h-3 w-3 mr-1" />
                        Chief of Staff
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground ml-14">{role.mandate}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ReportTypeSelector
                  value={reportType}
                  onChange={setReportType}
                  disabled={generating}
                />
                <DateRangeSelector
                  value={dateRange}
                  onChange={setDateRange}
                  disabled={generating}
                />
                <Button
                  className="w-full"
                  onClick={handleGenerateReport}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  All suggestions are advisory only and require human approval
                </p>
              </CardContent>
            </Card>

            <PreviousReports
              roleId={roleId!}
              onSelectReport={(report) => setCurrentReport(report as Report)}
              isOwner={isOwner}
            />
          </div>

          {/* Report Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <ReportViewer report={currentReport} isLoading={generating} />
            {currentReport && (
              <ReportActions
                report={currentReport}
                companyId={companyId!}
                onDismiss={() => setCurrentReport(null)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
