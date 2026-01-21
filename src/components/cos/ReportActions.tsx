import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Download, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ExportFormatDialog from './ExportFormatDialog';

interface ReportActionsProps {
  report: {
    id?: string;
    content: string;
    report_type: string;
    created_at: string;
  } | null;
  companyId: string;
  onDismiss: () => void;
  isSaving?: boolean;
}

export default function ReportActions({ report, companyId, onDismiss, isSaving }: ReportActionsProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);

  if (!report) return null;

  const handleSaveToMemory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { error } = await supabase.from('company_memory').insert({
        company_id: companyId,
        content: report.content.substring(0, 500) + (report.content.length > 500 ? '...' : ''),
        label: `CoS ${report.report_type.replace('_', ' ')} - ${new Date(report.created_at).toLocaleDateString()}`,
        pinned_by: user.id,
      });

      if (error) throw error;
      toast.success('Report summary saved to company memory');
    } catch (error) {
      console.error('Failed to save to memory:', error);
      toast.error('Failed to save to memory');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 pt-4 border-t">
        <Button
          variant="secondary"
          onClick={handleSaveToMemory}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save to Memory
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowExportDialog(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="ghost"
          onClick={onDismiss}
        >
          <X className="h-4 w-4 mr-2" />
          Dismiss
        </Button>
      </div>

      <ExportFormatDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        report={report}
      />
    </>
  );
}
