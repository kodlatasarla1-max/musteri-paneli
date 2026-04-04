import { useState, useEffect } from 'react';
import { getUser } from '../utils/auth';
import apiClient from '../utils/api';
import { LockedService } from '../pages/client/LockedService';

export const ServiceGuard = ({ keyword, serviceName, description, children }) => {
  const [isActive, setIsActive] = useState(null);
  const user = getUser();

  useEffect(() => {
    const fetchServices = async () => {
      if (!user?.client_id) {
        setIsActive(false);
        return;
      }
      try {
        const response = await apiClient.get(`/client-services/${user.client_id}`);
        const services = response.data;
        const kw = keyword.toLowerCase();
        const active = services.some(cs =>
          cs.is_active && cs.service_name && cs.service_name.toLowerCase().includes(kw)
        );
        setIsActive(active);
      } catch (error) {
        console.error('ServiceGuard fetch error:', error);
        setIsActive(false);
      }
    };
    fetchServices();
  }, [user?.client_id, keyword]);

  if (isActive === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!isActive) {
    return <LockedService serviceName={serviceName} description={description} />;
  }

  return children;
};
