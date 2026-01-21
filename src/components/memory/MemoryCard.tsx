import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, User, Bot } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MemoryCardProps {
  id: string;
  content: string;
  label: string | null;
  sourceRoleName?: string;
  pinnedByName?: string;
  createdAt: string;
  canDelete: boolean;
  onDelete: (id: string) => Promise<void>;
}

export default function MemoryCard({
  id,
  content,
  label,
  sourceRoleName,
  pinnedByName,
  createdAt,
  canDelete,
  onDelete,
}: MemoryCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="group">
      <CardContent className="p-4 space-y-3">
        {label && (
          <Badge variant="secondary" className="text-xs">
            {label}
          </Badge>
        )}
        
        <p className="text-sm text-foreground leading-relaxed">
          {content.length > 300 ? content.slice(0, 300) + "..." : content}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {pinnedByName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {pinnedByName}
              </span>
            )}
            {sourceRoleName && (
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                {sourceRoleName}
              </span>
            )}
            <span>{formattedDate}</span>
          </div>
          
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Memory</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this memory? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
