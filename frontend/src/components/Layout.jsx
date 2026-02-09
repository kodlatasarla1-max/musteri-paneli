import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Video, Image, BarChart3, Globe, ShoppingBag, Users, Settings, LogOut, Share2, Calendar, Receipt, Megaphone, Activity, Lock } from 'lucide-react';
import { getUser, logout } from '../utils/auth';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { tr } from '../utils/translations';

export const Layout = ({ role, clientId }) => {
  const navigate = useNavigate();
  const user = getUser();
  const [clientServices, setClientServices] = useState([]);

  useEffect(() => {
    if (role === 'client' && clientId) {
      loadClientServices();
    }
  }, [role, clientId]);

  const loadClientServices = async () => {
    try {
      const response = await apiClient.get(`/client-services/${clientId}`);
      setClientServices(response.data);
    } catch (error) {
      console.error('Error loading client services:', error);
    }
  };

  const isServiceActive = (serviceName) => {
    const service = clientServices.find(cs => cs.service_name === serviceName);
    return service ? service.is_active : false;
  };

  const adminNav = [
    { icon: LayoutDashboard, label: tr.sidebar.dashboard, path: '/admin/dashboard' },
    { icon: Users, label: tr.sidebar.clients, path: '/admin/clients' },
    { icon: Users, label: tr.sidebar.staff, path: '/admin/staff' },
    { icon: Video, label: tr.sidebar.content, path: '/admin/content' },
    { icon: Calendar, label: tr.sidebar.calendar, path: '/admin/calendar' },
    { icon: BarChart3, label: tr.sidebar.adsReports, path: '/admin/ads-reports' },
    { icon: Receipt, label: tr.sidebar.receipts, path: '/admin/receipts' },
    { icon: Megaphone, label: tr.sidebar.campaigns, path: '/admin/campaigns' },
    { icon: Activity, label: tr.sidebar.activityLogs, path: '/admin/logs' },
  ];

  const clientNav = [
    { icon: LayoutDashboard, label: tr.sidebar.dashboard, path: '/client/dashboard', active: true },
    { icon: Video, label: tr.sidebar.videoProduction, path: '/client/videos', active: isServiceActive('Video Shoot & Production') },
    { icon: Share2, label: tr.sidebar.socialMedia, path: '/client/social-media', active: isServiceActive('Social Media Management') },
    { icon: BarChart3, label: tr.sidebar.metaAds, path: '/client/ads', active: isServiceActive('Meta Ads Management') },
    { icon: Image, label: tr.sidebar.graphicDesign, path: '/client/designs', active: isServiceActive('Graphic Design') },
    { icon: Globe, label: tr.sidebar.websiteSetup, path: '/client/website', active: isServiceActive('Website Setup') },
    { icon: ShoppingBag, label: tr.sidebar.ecommerce, path: '/client/ecommerce', active: isServiceActive('E-commerce Management') },
  ];

  const staffNav = [
    { icon: LayoutDashboard, label: tr.sidebar.dashboard, path: '/staff/dashboard' },
    { icon: Users, label: tr.sidebar.clients, path: '/staff/clients' },
    { icon: Video, label: tr.sidebar.content, path: '/staff/content' },
    { icon: Calendar, label: tr.sidebar.calendar, path: '/staff/calendar' },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'staff' ? staffNav : clientNav;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen" data-testid="layout-container">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-[#0F172A] text-slate-300 flex flex-col border-r border-slate-800 z-50" data-testid="sidebar">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-semibold text-white" data-testid="sidebar-title">{tr.sidebar.agencyOS}</h1>
          <p className="text-xs text-slate-400 mt-1" data-testid="user-role">{user?.full_name || role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = window.location.pathname === item.path;
            const isLocked = role === 'client' && item.active === false && item.path !== '/client/dashboard';

            return (
              <button
                key={item.path}
                data-testid={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-lg'
                    : isLocked
                    ? 'text-slate-500 hover:text-slate-400'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {isLocked && <Lock className="h-4 w-4" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {tr.auth.logout}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 min-h-screen bg-slate-50" data-testid="main-content">
        <Outlet />
      </div>
    </div>
  );
};
