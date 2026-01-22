import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Bot } from 'lucide-react';

interface MemoMessageProps {
  fromRoleName: string;
  content: string;
  createdAt: string;
}

export default function MemoMessage({ fromRoleName, content, createdAt }: MemoMessageProps) {
  return (
    <div className="px-4 py-2">
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-2 shrink-0">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800">
                  <Bot className="mr-1 h-3 w-3" />
                  Memo from {fromRoleName}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm">{content}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
