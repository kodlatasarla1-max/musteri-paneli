import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { getUser } from '../utils/auth';

const PermissionsContext = createContext(null);

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (user) {
      loadPermissions();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadPermissions = async () => {
    try {
      const response = await apiClient.get('/user/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error loading permissions:', error);
      // Set default permissions based on role
      if (user?.role === 'admin') {
        setPermissions({
          role: 'admin',
          permissions: {
            can_manage_clients: true,
            can_manage_content: true,
            can_view_reports: true,
            can_approve_receipts: true,
            can_manage_calendar: true,
            can_manage_staff: true,
            can_manage_meta: true
          }
        });
      } else if (user?.role === 'staff') {
        setPermissions({
          role: 'staff',
          permissions: {
            can_manage_clients: false,
            can_manage_content: false,
            can_view_reports: false,
            can_approve_receipts: false,
            can_manage_calendar: false,
            can_manage_staff: false,
            can_manage_meta: false
          }
        });
      } else {
        setPermissions({
          role: 'client',
          permissions: {
            can_view_own_data: true,
            can_upload_receipts: true,
            can_request_revisions: true,
            can_manage_finance: true
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission) => {
    if (!permissions) return false;
    
    // Admin has all permissions
    if (permissions.role === 'admin') return true;
    
    return permissions.permissions?.[permission] === true;
  };

  const canAccess = (requiredPermissions) => {
    if (!permissions) return false;
    
    // Admin can access everything
    if (permissions.role === 'admin') return true;
    
    // Check if user has any of the required permissions
    if (Array.isArray(requiredPermissions)) {
      return requiredPermissions.some(perm => hasPermission(perm));
    }
    
    return hasPermission(requiredPermissions);
  };

  const isAdmin = () => permissions?.role === 'admin';
  const isStaff = () => permissions?.role === 'staff';
  const isClient = () => permissions?.role === 'client';

  return (
    <PermissionsContext.Provider value={{
      permissions,
      loading,
      hasPermission,
      canAccess,
      isAdmin,
      isStaff,
      isClient,
      reload: loadPermissions
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

// HOC for permission-based rendering
export const WithPermission = ({ permission, children, fallback = null }) => {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) return null;
  
  if (!hasPermission(permission)) {
    return fallback;
  }
  
  return children;
};

// Component to hide elements without permission
export const PermissionGate = ({ 
  permissions: requiredPermissions, 
  children, 
  fallback = null,
  requireAll = false 
}) => {
  const { permissions, loading } = usePermissions();
  
  if (loading) return null;
  if (!permissions) return fallback;
  
  // Admin always has access
  if (permissions.role === 'admin') return children;
  
  const permArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  const hasAccess = requireAll
    ? permArray.every(perm => permissions.permissions?.[perm] === true)
    : permArray.some(perm => permissions.permissions?.[perm] === true);
  
  return hasAccess ? children : fallback;
};
