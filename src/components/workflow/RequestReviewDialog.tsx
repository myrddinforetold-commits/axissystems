import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Play,
  SkipForward,
  Lightbulb,
  ArrowRight,
  MessageSquare,
  Check,
  X,
  ExternalLink,
  Copy,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { WorkflowRequest } from '@/hooks/useWorkflowRequests';

interface RequestReviewDialogProps {
  request: WorkflowRequest | null;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (editedContent?: string, notes?: string) => Promise<void>;
  onDeny: (notes?: string) => Promise<void>;
  isProcessing?: boolean;
}

const typeConfig = {
  send_memo: {
    label: 'Send Memo',
    icon: Mail,
    description: 'The role wants to send a memo to another role.',
    allowEdit: true,
  },
  start_task: {
    label: 'Start Task',
    icon: Play,
    description: 'The role is proposing to start a new task.',
    allowEdit: true,
  },
  continue_task: {
    label: 'Continue Task',
    icon: SkipForward,
    description: 'The role wants to continue working on the current task.',
    allowEdit: false,
  },
  suggest_next_task: {
    label: 'Suggest Next Task',
    icon: Lightbulb,
    description: 'The role is suggesting a follow-up task after completing its current work.',
    allowEdit: true,
  },
  review_output: {
    label: 'Review Output',
    icon: ClipboardCheck,
    description: 'Review the completed task output before autonomous work continues.',
    allowEdit: false,
  },
};

const parseTaskContent = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.title && parsed.description && parsed.completion_criteria) {
      return parsed as {
        title: string;
        description: string;
        completion_criteria: string;
        affected_files?: string[];
        affected_tables?: string[];
        implementation_notes?: string;
      };
    }
  } catch {
    // Not JSON, return null
  }
  return null;
};

const parseReviewOutputContent = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.task_title && parsed.output) {
      return parsed as {
        task_id: string;
        task_title: string;
        task_description: string;
        completion_criteria: string;
        output: string;
        attempts: number;
        completion_summary: string | null;
      };
    }
  } catch {
    // Not JSON, return null
  }
  return null;
};

const formatAsImplementationPrompt = (request: WorkflowRequest): string | null => {
  if (request.request_type !== 'start_task' && request.request_type !== 'suggest_next_task') {
    return null;
  }

  const taskContent = parseTaskContent(request.proposed_content);
  const roleName = request.requesting_role?.display_name || request.requesting_role?.name || 'Unknown';

  if (!taskContent) {
    return `Implement the following task:\n\n${request.summary}\n\n---\n\n${request.proposed_content}`;
  }

  let prompt = `## Implementation Request from ${roleName}\n\n`;
  prompt += `### Task: ${taskContent.title || request.summary}\n\n`;
  prompt += `### Description\n${taskContent.description || 'No description provided'}\n\n`;
  prompt += `### Acceptance Criteria\n${taskContent.completion_criteria || 'No criteria specified'}\n\n`;

  if (taskContent.affected_files?.length) {
    prompt += `### Files to Modify\n${taskContent.affected_files.join(', ')}\n\n`;
  }
  if (taskContent.affected_tables?.length) {
    prompt += `### Database Tables\n${taskContent.affected_tables.join(', ')}\n\n`;
  }
  if (taskContent.implementation_notes) {
    prompt += `### Implementation Notes\n${taskContent.implementation_notes}\n\n`;
  }

  prompt += `---\nPlease implement this task and verify the acceptance criteria are met.`;

  return prompt;
};

export default function RequestReviewDialog({
  request,
  companyId,
  open,
  onOpenChange,
  onApprove,
  onDeny,
  isProcessing,
}: RequestReviewDialogProps) {
  const navigate = useNavigate();
  const [editedContent, setEditedContent] = useState('');
  const [editedTask, setEditedTask] = useState({ title: '', description: '', completion_criteria: '' });
  const [reviewNotes, setReviewNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);

  if (!request) return null;

  const type = request.request_type as keyof typeof typeConfig;
  const typeInfo = typeConfig[type] || typeConfig.send_memo;
  const TypeIcon = typeInfo.icon;
  const isTaskType = type === 'start_task' || type === 'suggest_next_task';
  const isReviewOutputType = type === 'review_output';
  const taskContent = parseTaskContent(request.proposed_content);
  const reviewOutputContent = isReviewOutputType ? parseReviewOutputContent(request.proposed_content) : null;

  const fromRoleName = request.requesting_role?.display_name || request.requesting_role?.name || 'Unknown';
  const toRoleName = request.target_role?.display_name || request.target_role?.name;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditedContent('');
      setEditedTask({ title: '', description: '', completion_criteria: '' });
      setReviewNotes('');
      setIsEditing(false);
      setIsEditingTask(false);
    }
    onOpenChange(newOpen);
  };

  const handleApprove = async () => {
    let finalContent: string | undefined;
    if (isEditingTask) {
      finalContent = JSON.stringify(editedTask);
    } else if (isEditing) {
      finalContent = editedContent;
    }
    await onApprove(finalContent, reviewNotes || undefined);
    handleOpenChange(false);
  };

  const handleDeny = async () => {
    await onDeny(reviewNotes || undefined);
    handleOpenChange(false);
  };

  const handleViewRole = () => {
    navigate(`/company/${companyId}/role/${request.requesting_role_id}`);
    handleOpenChange(false);
  };

  const startEditing = () => {
    if (isTaskType && taskContent) {
      setEditedTask(taskContent);
      setIsEditingTask(true);
    } else {
      setEditedContent(request.proposed_content);
      setIsEditing(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <TypeIcon className="mr-1 h-4 w-4" />
              {typeInfo.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </span>
          </div>
          <DialogTitle className="text-xl">Review Workflow Request</DialogTitle>
          <DialogDescription>{typeInfo.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">From:</span>
              <span className="font-medium">{fromRoleName}</span>
            </div>
            {toRoleName && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{toRoleName}</span>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewRole}
              className="ml-auto"
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              View Role Chat
            </Button>
          </div>

          <Separator />

          <div>
            <Label className="text-sm text-muted-foreground">Summary</Label>
            <p className="mt-1 text-sm font-medium">{request.summary}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm text-muted-foreground">
                {type === 'send_memo' ? 'Memo Content' : 'Proposed Content'}
              </Label>
              {typeInfo.allowEdit && !isEditing && !isEditingTask && request.status === 'pending' && (
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  Edit before approving
                </Button>
              )}
            </div>

            {isEditingTask ? (
              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <Label htmlFor="edit-title" className="text-xs text-muted-foreground">Task Title</Label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editedTask.title}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description" className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editedTask.description}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-criteria" className="text-xs text-muted-foreground">Completion Criteria</Label>
                  <Textarea
                    id="edit-criteria"
                    value={editedTask.completion_criteria}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, completion_criteria: e.target.value }))}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            ) : isReviewOutputType && reviewOutputContent ? (
              <div className="rounded-md border bg-muted/50 p-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Task</Label>
                  <p className="font-medium">{reviewOutputContent.task_title}</p>
                </div>
                {reviewOutputContent.completion_summary && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Summary</Label>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{reviewOutputContent.completion_summary}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Task Output</Label>
                  <div className="mt-2 rounded-md border bg-background p-3 max-h-64 overflow-y-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{reviewOutputContent.output}</ReactMarkdown>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Completed in {reviewOutputContent.attempts} attempt(s)
                </div>
              </div>
            ) : isTaskType && taskContent ? (
              <div className="rounded-md border bg-muted/50 p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Task Title</Label>
                  <p className="font-medium">{taskContent.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm whitespace-pre-wrap break-words">{taskContent.description}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Completion Criteria</Label>
                  <p className="text-sm whitespace-pre-wrap break-words">{taskContent.completion_criteria}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/50 p-4">
                <pre className="whitespace-pre-wrap break-words text-sm font-mono">
                  {request.proposed_content}
                </pre>
              </div>
            )}
          </div>

          {request.status === 'pending' && (
            <div>
              <Label htmlFor="review-notes" className="text-sm text-muted-foreground">
                <MessageSquare className="inline mr-1 h-3 w-3" />
                Review Notes (Optional)
              </Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about your decision..."
                rows={2}
                className="mt-1"
              />
            </div>
          )}

          {request.review_notes && request.status !== 'pending' && (
            <div>
              <Label className="text-sm text-muted-foreground">Review Notes</Label>
              <p className="mt-1 text-sm italic text-muted-foreground border-l-2 border-muted pl-2">
                {request.review_notes}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {request.status === 'pending' ? (
            <>
              <Button
                variant="outline"
                onClick={handleDeny}
                disabled={isProcessing}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="mr-1 h-4 w-4" />
                Deny
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-primary hover:bg-primary/90"
              >
                <Check className="mr-1 h-4 w-4" />
                {isEditing || isEditingTask ? 'Approve with Edits' : 'Approve'}
              </Button>
            </>
          ) : (
            <div className="flex w-full justify-between">
              {request.status === 'approved' && isTaskType && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    const prompt = formatAsImplementationPrompt(request);
                    if (prompt) {
                      await navigator.clipboard.writeText(prompt);
                      toast.success('Copied to clipboard', {
                        description: 'Paste this into your development platform'
                      });
                    }
                  }}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </Button>
              )}
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="ml-auto">
                Close
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
