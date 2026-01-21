import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertTriangle, CheckSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { ReportType } from './ReportTypeSelector';

interface Report {
  id?: string;
  content: string;
  report_type: ReportType;
  created_at: string;
}

interface ReportViewerProps {
  report: Report | null;
  isLoading?: boolean;
}

const reportMeta: Record<ReportType, { icon: typeof FileText; label: string; color: string }> = {
  weekly_summary: { icon: FileText, label: 'Weekly Summary', color: 'bg-blue-500/10 text-blue-600' },
  blockers: { icon: AlertTriangle, label: 'Blockers', color: 'bg-orange-500/10 text-orange-600' },
  action_items: { icon: CheckSquare, label: 'Action Items', color: 'bg-green-500/10 text-green-600' },
};

export default function ReportViewer({ report, isLoading }: ReportViewerProps) {
  if (isLoading) {
    return (
      <Card className="flex-1">
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <p>Generating report...</p>
            <p className="text-xs">Synthesizing data from all roles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="flex-1">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No report generated yet</p>
            <p className="text-sm mt-1">Select a report type and click Generate</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meta = reportMeta[report.report_type];
  const Icon = meta.icon;

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={meta.color}>
              <Icon className="h-3 w-3 mr-1" />
              {meta.label}
            </Badge>
            <CardTitle className="text-lg">Generated Report</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[500px] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {report.content.split('\n').map((line, i) => {
                // Simple markdown-like rendering
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-lg font-semibold mt-6 mb-3 text-foreground">{line.slice(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-base font-medium mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="ml-4 text-muted-foreground">{line.slice(2)}</li>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-semibold mt-2">{line.slice(2, -2)}</p>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i} className="text-muted-foreground">{line}</p>;
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
