import { Wrench, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function MaintenancePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Wrench className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Under Maintenance
          </h1>
          <p className="text-muted-foreground">
            We're currently performing scheduled maintenance to improve your experience. 
            Please check back shortly.
          </p>
        </div>

        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Homepage
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
