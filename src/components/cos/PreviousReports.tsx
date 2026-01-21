import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileText, AlertTriangle, CheckSquare, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { ReportType } from './ReportTypeSelector';

interface Report {
  id: string;
  content: string;
  report_type: ReportType;
  created_at: string;
}

interface PreviousReportsProps {
  roleId: string;
  onSelectReport: (report: Report) => void;
  isOwner: boolean;
}

const reportIcons: Record<ReportType, typeof FileText> = {
  weekly_summary: FileText,
  blockers: AlertTriangle,
  action_items: CheckSquare,
};

export default function PreviousReports({ roleId, onSelectReport, isOwner }: PreviousReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && reports.length === 0) {
      fetchReports();
    }
  }, [isOpen, roleId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cos_reports')
        .select('id, content, report_type, created_at')
        .eq('role_id', roleId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReports((data as Report[]) || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('cos_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success('Report deleted');
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete report');
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Previous Reports</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No previous reports generated
              </p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {reports.map((report) => {
                    const Icon = reportIcons[report.report_type];
                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => onSelectReport(report)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="capitalize">
                            <Icon className="h-3 w-3 mr-1" />
                            {report.report_type.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(report.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(report.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
