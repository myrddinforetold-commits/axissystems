import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlatformSetting {
  id: string;
  key: string;
  value: boolean | string | number | object;
  updated_at: string;
  updated_by: string | null;
}

type SettingKey = 
  | 'allow_signups'
  | 'require_email_verification'
  | 'maintenance_mode'
  | 'feature_ai_task_execution'
  | 'feature_cos_reports'
  | 'feature_company_memory';

export function usePlatformSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');
      
      if (error) throw error;
      
      // Convert to a map for easy access
      const settingsMap: Record<string, boolean> = {};
      data?.forEach((setting) => {
        // Parse JSON value - stored as "true" or "false" strings
        const value = setting.value;
        settingsMap[setting.key] = value === true || value === 'true';
      });
      
      return settingsMap;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: SettingKey; value: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('platform_settings')
        .update({ 
          value: value,
          updated_by: userData.user?.id 
        })
        .eq('key', key);
      
      if (error) throw error;
      return { key, value };
    },
    onSuccess: ({ key, value }) => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({
        title: 'Setting updated',
        description: `${key.replace(/_/g, ' ')} has been ${value ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating setting',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getSetting = (key: SettingKey): boolean => {
    return settings?.[key] ?? false;
  };

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    getSetting,
    isUpdating: updateSetting.isPending,
  };
}

// Lightweight hook for checking a single setting (used by non-admin users)
export function usePlatformSetting(key: 'maintenance_mode') {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-setting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', key)
        .single();
      
      if (error) {
        // If user can't read (not admin and not maintenance_mode), return false
        return false;
      }
      
      return data?.value === true || data?.value === 'true';
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  return { value: data ?? false, isLoading };
}
