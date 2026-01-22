import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Play, 
  SkipForward, 
  Lightbulb, 
  ArrowRight,
  Check,
  X,
  Eye,
  Clock,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WorkflowRequest } from '@/hooks/useWorkflowRequests';

// Format task as implementation prompt for copying
const formatAsImplementationPrompt = (request: WorkflowRequest): string | null => {
  if (request.request_type !== 'start_task' && request.request_type !== 'suggest_next_task') {
    return null;
  }
  
  let taskDetails: { 
    title?: string; 
    description?: string; 
    completion_criteria?: string;
    affected_files?: string[];
    affected_tables?: string[];
    implementation_notes?: string;
  };
  
  try {
    taskDetails = JSON.parse(request.proposed_content);
  } catch {
    return `Implement the following task:\n\n${request.summary}\n\n---\n\n${request.proposed_content}`;
  }
  
  const roleName = request.requesting_role?.display_name || request.requesting_role?.name || 'Unknown';
  
  let prompt = `## Implementation Request from ${roleName}\n\n`;
  prompt += `### Task: ${taskDetails.title || request.summary}\n\n`;
  prompt += `### Description\n${taskDetails.description || 'No description provided'}\n\n`;
  prompt += `### Acceptance Criteria\n${taskDetails.completion_criteria || 'No criteria specified'}\n\n`;
  
  if (taskDetails.affected_files?.length) {
    prompt += `### Files to Modify\n${taskDetails.affected_files.join(', ')}\n\n`;
  }
  if (taskDetails.affected_tables?.length) {
    prompt += `### Database Tables\n${taskDetails.affected_tables.join(', ')}\n\n`;
  }
  if (taskDetails.implementation_notes) {
    prompt += `### Implementation Notes\n${taskDetails.implementation_notes}\n\n`;
  }
  
  prompt += `---\nPlease implement this task and verify the acceptance criteria are met.`;
  
  return prompt;
};

interface WorkflowRequestCardProps {
  request: WorkflowRequest;
  onApprove: () => void;
  onDeny: () => void;
  onView: () => void;
  isProcessing?: boolean;
}

const typeConfig = {
  send_memo: {
    label: 'Memo',
    icon: Mail,
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
  },
  start_task: {
    label: 'Start Task',
    icon: Play,
    color: 'bg-green-500/10 text-green-600 border-green-200',
  },
  continue_task: {
    label: 'Continue',
    icon: SkipForward,
    color: 'bg-purple-500/10 text-purple-600 border-purple-200',
  },
  suggest_next_task: {
    label: 'Suggestion',
    icon: Lightbulb,
    color: 'bg-amber-500/10 text-amber-600 border-amber-200',
  },
};

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-600 border-amber-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-500/10 text-green-600 border-green-200',
  },
  denied: {
    label: 'Denied',
    className: 'bg-red-500/10 text-red-600 border-red-200',
  },
};

export default function WorkflowRequestCard({
  request,
  onApprove,
  onDeny,
  onView,
  isProcessing,
}: WorkflowRequestCardProps) {
  const type = request.request_type as keyof typeof typeConfig;
  const typeInfo = typeConfig[type] || typeConfig.send_memo;
  const TypeIcon = typeInfo.icon;
  
  const status = request.status as keyof typeof statusConfig;
  const statusInfo = statusConfig[status];

  const fromRoleName = request.requesting_role?.display_name || request.requesting_role?.name || 'Unknown';
  const toRoleName = request.target_role?.display_name || request.target_role?.name;

  const isPending = request.status === 'pending';
  const isApprovedTask = request.status === 'approved' && 
    (request.request_type === 'start_task' || request.request_type === 'suggest_next_task');

  const handleCopyToClipboard = async () => {
    const prompt = formatAsImplementationPrompt(request);
    if (prompt) {
      await navigator.clipboard.writeText(prompt);
      toast.success('Copied to clipboard', {
        description: 'Paste this into your development platform'
      });
    }
  };

  return (
    <Card className={cn(
      'transition-all',
      isPending && 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/10'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header with type badge and status */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className={cn('text-xs', typeInfo.color)}>
                <TypeIcon className="mr-1 h-3 w-3" />
                {typeInfo.label}
              </Badge>
              
              {!isPending && (
                <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
                  {statusInfo.label}
                </Badge>
              )}

              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* From/To roles */}
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="font-medium text-foreground">{fromRoleName}</span>
              {toRoleName && (
                <>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">{toRoleName}</span>
                </>
              )}
            </div>

            {/* Summary */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {request.summary}
            </p>

            {/* Review notes if reviewed */}
            {request.review_notes && (
              <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                {request.review_notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onView}
              className="w-full justify-start"
            >
              <Eye className="mr-1 h-3 w-3" />
              View
            </Button>
            
            {isApprovedTask && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyToClipboard}
                className="w-full justify-start"
              >
                <Copy className="mr-1 h-3 w-3" />
                Copy
            </Button>
            )}
            
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="w-full justify-start bg-green-600 hover:bg-green-700"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDeny}
                  disabled={isProcessing}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="mr-1 h-3 w-3" />
                  Deny
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
