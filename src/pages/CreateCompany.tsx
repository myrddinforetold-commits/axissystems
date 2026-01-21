import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import TemplateSelectionDialog from '@/components/company/TemplateSelectionDialog';

export default function CreateCompany() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Company name is required');
      setIsSubmitting(false);
      return;
    }

    if (trimmedName.length > 100) {
      setError('Company name must be less than 100 characters');
      setIsSubmitting(false);
      return;
    }

    // Use the security definer function to create company with owner
    const { data, error } = await supabase.rpc('create_company_with_owner', {
      company_name: trimmedName,
    });

    if (error) {
      console.error('Error creating company:', error);
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    // Show template selection dialog
    setCreatedCompanyId(data);
    setShowTemplateDialog(true);
    setIsSubmitting(false);
  };

  const handleTemplateComplete = () => {
    setShowTemplateDialog(false);
    if (createdCompanyId) {
      navigate(`/companies/${createdCompanyId}`, { replace: true });
    }
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => navigate('/companies')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <CardTitle className="text-2xl font-bold tracking-tight">Create Company</CardTitle>
            <CardDescription>Set up a new company workspace</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Acme Inc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Company'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {createdCompanyId && (
        <TemplateSelectionDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          companyId={createdCompanyId}
          onComplete={handleTemplateComplete}
        />
      )}
    </>
  );
}
