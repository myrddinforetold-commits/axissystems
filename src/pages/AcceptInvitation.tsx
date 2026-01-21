import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface InvitationDetails {
  id: string;
  company_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  company_name: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_invitation_by_token', {
          _token: token,
        });

        if (error) throw error;

        if (!data || data.length === 0) {
          setError('This invitation is invalid, expired, or has already been used.');
          setLoading(false);
          return;
        }

        setInvitation(data[0] as InvitationDetails);
      } catch (err) {
        console.error('Error fetching invitation:', err);
        setError('Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !user) return;

    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        _token: token,
      });

      if (error) throw error;

      if (!data) {
        toast.error('Could not accept invitation. Make sure you are logged in with the correct email.');
        return;
      }

      setSuccess(true);
      toast.success('Welcome to the team!');
      
      // Redirect to company after a brief delay
      setTimeout(() => {
        navigate(`/companies/${invitation?.company_id}`, { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link to="/companies">
              <Button>Go to Companies</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>
              You've joined {invitation?.company_name}. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              You've been invited to join <strong>{invitation?.company_name}</strong> as a {invitation?.role}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please log in or sign up with <strong>{invitation?.email}</strong> to accept this invitation.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Link to={`/login?redirect=/invite/${token}`} className="w-full">
              <Button className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Log In
              </Button>
            </Link>
            <Link to={`/signup?redirect=/invite/${token}&email=${encodeURIComponent(invitation?.email || '')}`} className="w-full">
              <Button variant="outline" className="w-full">
                Sign Up
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const emailMismatch = user.email?.toLowerCase() !== invitation?.email.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Join {invitation?.company_name}</CardTitle>
          <CardDescription>
            You've been invited to join as a {invitation?.role}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailMismatch ? (
            <div className="rounded-md bg-destructive/10 p-4 text-sm">
              <p className="font-medium text-destructive">Email mismatch</p>
              <p className="text-muted-foreground mt-1">
                This invitation was sent to <strong>{invitation?.email}</strong>, but you're logged in as <strong>{user.email}</strong>.
              </p>
              <p className="text-muted-foreground mt-2">
                Please log out and sign in with the correct email to accept this invitation.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Click below to join the team and start collaborating.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          {emailMismatch ? (
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
            >
              Log Out
            </Button>
          ) : (
            <>
              <Link to="/companies">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button onClick={handleAccept} disabled={accepting}>
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
