import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

export default function AdminSettings() {
  const { settings, isLoading, updateSetting, isUpdating } = usePlatformSettings();

  const handleToggle = (key: string, checked: boolean) => {
    updateSetting.mutate({ key: key as any, value: checked });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure platform-wide settings
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure platform-wide settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Manage general platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow New Signups</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to create accounts
              </p>
            </div>
            <Switch 
              checked={settings?.allow_signups ?? true}
              onCheckedChange={(checked) => handleToggle('allow_signups', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                Require users to verify their email before accessing the platform
              </p>
            </div>
            <Switch 
              checked={settings?.require_email_verification ?? false}
              onCheckedChange={(checked) => handleToggle('require_email_verification', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Show maintenance message to non-admin users
              </p>
            </div>
            <Switch 
              checked={settings?.maintenance_mode ?? false}
              onCheckedChange={(checked) => handleToggle('maintenance_mode', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Enable or disable specific features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>AI Task Execution</Label>
              <p className="text-sm text-muted-foreground">
                Allow AI roles to execute tasks autonomously
              </p>
            </div>
            <Switch 
              checked={settings?.feature_ai_task_execution ?? true}
              onCheckedChange={(checked) => handleToggle('feature_ai_task_execution', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Chief of Staff Reports</Label>
              <p className="text-sm text-muted-foreground">
                Enable AI-generated summary reports
              </p>
            </div>
            <Switch 
              checked={settings?.feature_cos_reports ?? true}
              onCheckedChange={(checked) => handleToggle('feature_cos_reports', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Company Memory</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to pin information to company-wide memory
              </p>
            </div>
            <Switch 
              checked={settings?.feature_company_memory ?? true}
              onCheckedChange={(checked) => handleToggle('feature_company_memory', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Platform details and version</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Platform</p>
              <p className="font-medium">Frontier Intelligence</p>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Environment</p>
              <p className="font-medium">Production</p>
            </div>
            <div>
              <p className="text-muted-foreground">Backend</p>
              <p className="font-medium">Lovable Cloud</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
