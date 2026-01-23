import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlatformSetting } from './usePlatformSettings';
import { useAdminStatus } from './useAdminStatus';

/**
 * Hook that checks maintenance mode and redirects non-admin users to the maintenance page.
 * Should be used in the main app layout or protected route wrapper.
 */
export function useMaintenanceMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const { value: isMaintenanceMode, isLoading: isLoadingMaintenance } = usePlatformSetting('maintenance_mode');
  const { isAdmin, loading: isLoadingAdmin } = useAdminStatus();

  const isLoading = isLoadingMaintenance || isLoadingAdmin;
  const isOnMaintenancePage = location.pathname === '/maintenance';
  const isOnPublicPage = ['/', '/login', '/signup'].includes(location.pathname);

  useEffect(() => {
    if (isLoading) return;

    // If maintenance mode is on and user is not admin
    if (isMaintenanceMode && !isAdmin && !isOnMaintenancePage && !isOnPublicPage) {
      navigate('/maintenance', { replace: true });
    }

    // If maintenance mode is off and user is on maintenance page, redirect to companies
    if (!isMaintenanceMode && isOnMaintenancePage) {
      navigate('/companies', { replace: true });
    }
  }, [isMaintenanceMode, isAdmin, isLoading, isOnMaintenancePage, isOnPublicPage, navigate]);

  return {
    isMaintenanceMode,
    isAdmin,
    isLoading,
    shouldShowContent: !isMaintenanceMode || isAdmin || isOnPublicPage,
  };
}
