import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Member {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
}

interface TeamTabProps {
  members: Member[];
  currentUserId: string | undefined;
}

export default function TeamTab({ members, currentUserId }: TeamTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
        </CardTitle>
        <CardDescription>
          {members.length} member{members.length !== 1 ? 's' : ''} in this company
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{member.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  {member.user_id === currentUserId ? 'You' : ''}
                </p>
              </div>
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                {member.role === 'owner' ? 'Owner' : 'Member'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
